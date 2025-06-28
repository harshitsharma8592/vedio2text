const Transcript = require("../models/Transcript");
const { runTranscription } = require("../utils/callPythonEngine");
const fetch = require("node-fetch");

// Helper to get channel info from YouTube oEmbed
// Helper to get channel info from YouTube oEmbed
function normalizeYouTubeUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1);
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        const videoId = parsed.pathname.split("/embed/")[1];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }

      // Already in correct format
      return url;
    }

    return url;
  } catch (e) {
    console.error("[normalizeYouTubeUrl] Invalid URL:", url);
    return url;
  }
}

async function getChannelInfo(youtubeUrl) {
  try {
    const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
    const res = await fetch(oembedUrl);

    if (!res.ok) {
      console.error(`[getChannelInfo] oEmbed fetch failed: ${res.status} ${res.statusText}`);
      return { channelName: "Unknown", channelUrl: "" };
    }

    const data = await res.json();
    return {
      channelName: data.author_name || "Unknown",
      channelUrl: data.author_url || ""
    };
  } catch (e) {
    console.error("[getChannelInfo] Exception:", e.message);
    return { channelName: "Unknown", channelUrl: "" };
  }
}


exports.createTranscript = async (req, res) => {
  const { youtubeUrl, language = "auto" } = req.body;

  console.log("[createTranscript] Received request:", { youtubeUrl, language });

  if (!youtubeUrl) {
    console.warn("[createTranscript] No YouTube URL provided.");
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
    // Run the Python engine and get the result
    console.log("[createTranscript] Calling runTranscription...");
    const result = await runTranscription(youtubeUrl, language);
    console.log("[createTranscript] Python result:", result);

    if (!result || !result.transcript) {
      console.error("[createTranscript] No transcript returned from Python.");
      throw new Error("Transcription failed - no result returned");
    }

    // Fetch channel info
    const { channelName, channelUrl } = await getChannelInfo(youtubeUrl);
    console.log("[createTranscript] Channel info:", { channelName, channelUrl });
    // Create new transcript document
    const transcript = new Transcript({
      youtubeUrl,
      transcriptText: result.transcript,
      segments: result.segments || [],
      overallSentiment: result.overallSentiment || "neutral",
      language: result.language || "unknown",
      channelName,
      channelUrl,
      createdAt: new Date()
    });

    // Save to MongoDB
    console.log("[createTranscript] Saving transcript to MongoDB...");
    const savedTranscript = await transcript.save();
    console.log("[createTranscript] Transcript saved:", savedTranscript._id);

    // Return the saved transcript
    res.status(201).json({
      _id: savedTranscript._id,
      youtubeUrl: savedTranscript.youtubeUrl,
      transcriptText: savedTranscript.transcriptText,
      segments: savedTranscript.segments,
      overallSentiment: savedTranscript.overallSentiment,
      language: savedTranscript.language,
      channelName: savedTranscript.channelName,
      channelUrl: savedTranscript.channelUrl,
      createdAt: savedTranscript.createdAt
    });
  } catch (error) {
    console.error("[createTranscript] Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate transcript",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getTranscript = async (req, res) => {
  console.log("[getTranscript] Fetching transcript with ID:", req.params.id);
  try {
    const transcript = await Transcript.findById(req.params.id);
    if (!transcript) {
      console.warn("[getTranscript] Transcript not found:", req.params.id);
      return res.status(404).json({ message: "Transcript not found" });
    }
    res.json(transcript);
  } catch (error) {
    console.error("[getTranscript] Error:", error.message);
    res.status(500).json({ 
      error: "Failed to retrieve transcript",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getAllTranscripts = async (req, res) => {
  console.log("[getAllTranscripts] Fetching all transcripts...");
  try {
    const transcripts = await Transcript.find({}).sort({ createdAt: -1 });
    res.json(transcripts);
  } catch (error) {
    console.error("[getAllTranscripts] Error:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch transcripts",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};