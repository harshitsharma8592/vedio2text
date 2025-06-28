const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { promisify } = require('util');
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const Transcript = require("../models/Transcript");
const { getChannelInfo } = require('./transcriptController');

exports.startLiveTranscription = async (ws, youtubeUrl, channelName = "Unknown", channelUrl = "") => {
  const sessionId = uuidv4();
  const tempDir = path.join(__dirname, '../../temp_live_chunks', sessionId);

  try {
    if (!await exists(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Only fetch channel info if not provided
    if (channelName === "Unknown" || !channelUrl) {
      try {
        const channelInfo = await getChannelInfo(youtubeUrl);
        channelName = channelInfo.channelName;
        channelUrl = channelInfo.channelUrl;
        console.log("[liveController] Channel info fetched:", channelInfo);
      } catch (e) {
        console.error("[liveController] getChannelInfo error:", e.message);
      }
    }

    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../python-engine/live_transcriber.py'),
      youtubeUrl,
      sessionId
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    console.log(`Python process started with PID: ${pythonProcess.pid}`);

    let fullText = '';
    const segments = [];
    let isActive = true;

    const saveLiveTranscript = async () => {
      if (segments.length > 0) {
        const detectedLang = segments[0]?.language || 'unknown';
        const overallSentiment = getOverallSentiment(segments);

        await Transcript.create({
          youtubeUrl,
          transcriptText: fullText,
          segments,
          overallSentiment,
          language: detectedLang,
          channelName,
          channelUrl,
          createdAt: new Date()
        });
        console.log("✅ Live transcript saved to MongoDB");
      }
    };

    const cleanup = async () => {
      isActive = false;
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      try {
        await saveLiveTranscript();
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    };

    pythonProcess.stdout.on('data', (data) => {
      if (!isActive) return;

      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        const output = line.trim();
        if (!output) continue;

        if (!output.startsWith('{') && !output.startsWith('[')) {
          console.log('Python log:', output);
          continue;
        }

        try {
          const result = JSON.parse(output);

          if (result.error) {
            console.error('Transcription error:', result.error);
            ws.send(JSON.stringify({
              type: 'error',
              message: result.error
            }));
            continue;
          }

          const segment = {
            startTime: result.timestamp || new Date().toISOString(),
            endTime: new Date(new Date(result.timestamp).getTime() + 30000).toISOString(),
            text: result.text,
            sentiment: result.sentiment || 'neutral',
            language: result.language || 'unknown',
            _id: uuidv4(),
            segmentNumber: result.segment_number || segments.length + 1
          };

          if (result.text) {
            fullText += (fullText ? '\n\n' : '') + result.text;
            segments.push(segment);
          }

          ws.send(JSON.stringify({
            type: 'update',
            data: {
              transcriptText: fullText,
              segments: [...segments],
              overallSentiment: getOverallSentiment(segments),
              language: segment.language || 'en',
              channelName,
              channelUrl
            }
          }));

        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'Output:', output);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const errOutput = data.toString().trim();
      if (!errOutput) return;

      if (!errOutput.includes('[FFmpeg]')) {
        console.error('[PYTHON STDERR]', errOutput);
        if (isActive) {
          ws.send(JSON.stringify({
            type: 'error',
            message: errOutput
          }));
        }
      } else {
        console.log('[FFmpeg]', errOutput);
      }
    });

    pythonProcess.on('close', async (code) => {
      console.log(`Python process exited with code ${code}`);
      try {
        await saveLiveTranscript();
      } catch (err) {
        console.error("Failed to save live transcript:", err);
      }
      if (isActive) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Transcription process ended with code ${code}`
        }));
      }
      cleanup();
    });

    ws.on('close', cleanup);
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      cleanup();
    });

  } catch (err) {
    console.error('Initialization error:', err);
    ws.send(JSON.stringify({
      type: 'error',
      message: err.message || 'Failed to initialize transcription'
    }));
    throw err;
  }
};

function getOverallSentiment(segments) {
  if (!segments.length) return 'neutral';

  const counts = { positive: 0, neutral: 0, negative: 0 };
  segments.forEach(s => counts[s.sentiment]++);

  const total = segments.length;
  const p = counts.positive / total;
  const n = counts.negative / total;

  if (p > 0.5) return 'positive';
  if (n > 0.5) return 'negative';
  if (p > n) return 'positive';
  if (n > p) return 'negative';
  return 'neutral';
}