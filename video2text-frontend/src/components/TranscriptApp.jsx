import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

export default function TranscriptApp() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [channelInfo, setChannelInfo] = useState({ channelName: "", channelUrl: "" });
  const [error, setError] = useState("");
  const [mode, setMode] = useState("recorded");
  const [loading, setLoading] = useState(false);
  const [transcriptData, setTranscriptData] = useState(null);
  const [liveStatus, setLiveStatus] = useState("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveSegments, setLiveSegments] = useState([]);
  const [ws, setWs] = useState(null);

  // Word-based sentiment analysis
  const [word, setWord] = useState("");
  const [wordStats, setWordStats] = useState({ positive: 0, neutral: 0, negative: 0, total: 0 });

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  // Fetch channel info when youtubeUrl changes
  useEffect(() => {
    async function fetchChannelInfo(url) {
      setChannelInfo({ channelName: "", channelUrl: "" });
      if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) return;
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const res = await fetch(oembedUrl);
        if (!res.ok) return;
        const data = await res.json();
        setChannelInfo({
          channelName: data.author_name || "",
          channelUrl: data.author_url || ""
        });
      } catch {
        setChannelInfo({ channelName: "", channelUrl: "" });
      }
    }
    fetchChannelInfo(youtubeUrl);
  }, [youtubeUrl]);

  function downloadTranscript() {
    if (!displayData?.transcriptText) return;
    const element = document.createElement("a");
    const file = new Blob([displayData.transcriptText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `youtube-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  async function handleTranscribe() {
    if (!youtubeUrl.trim()) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    setError("");
    setLoading(true);
    setTranscriptData(null);

    try {
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to transcribe");
      }

      const data = await response.json();
      setTranscriptData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startLiveTranscription() {
    if (!youtubeUrl.trim()) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setError("");
    setLiveStatus("connecting");
    setLiveTranscript("Connecting to live stream...");
    setLiveSegments([]);

    const websocketUrl = window.location.hostname === 'localhost'
      ? `ws://localhost:5000/api/live`
      : `wss://${window.location.host}/api/live`;

    const websocket = new WebSocket(websocketUrl);

    websocket.onopen = () => {
      setLiveStatus("transcribing");
      setLiveTranscript("Starting live transcription...");
      const message = JSON.stringify({
      youtubeUrl,
      channelName: channelInfo.channelName,
      channelUrl: channelInfo.channelUrl
    });
      websocket.send(message);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.error) {
          setError(message.error);
          setLiveStatus("error");
          return;
        }

        if (message.type === "update" && message.data) {
          const { transcriptText, segments } = message.data;
          setLiveTranscript(transcriptText);
          setLiveSegments(segments);
        }
      } catch (err) {
        setError("Failed to process live transcription data");
        setLiveStatus("error");
      }
    };

    websocket.onerror = () => {
      setError("WebSocket connection failed");
      setLiveStatus("error");
      websocket.close();
    };

    websocket.onclose = (event) => {
      setLiveStatus("idle");
      if (!event.wasClean) setError("Connection closed unexpectedly");
      setWs(null);
    };

    setWs(websocket);
  }

  function stopLiveTranscription() {
    if (ws) {
      ws.close();
      setWs(null);
      setLiveStatus("idle");
    }
  }

  const sentimentColors = {
    positive: "#10B981",
    negative: "#EF4444",
    neutral: "#6B7280",
  };

  const getSentimentData = (segments) => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    segments?.forEach((seg) => counts[seg.sentiment]++);
    return Object.entries(counts).map(([sentiment, count]) => ({
      name: sentiment,
      value: count,
      color: sentimentColors[sentiment],
    }));
  };

  const getOverallSentiment = (segments) => {
    if (!segments || segments.length === 0) return "neutral";
    const counts = { positive: 0, neutral: 0, negative: 0 };
    segments.forEach((s) => counts[s.sentiment]++);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const COLORS = ["#10B981", "#6B7280", "#EF4444"];

  const displayData = mode === "live" ? {
    transcriptText: liveTranscript,
    segments: liveSegments,
    overallSentiment: getOverallSentiment(liveSegments),
    // live mode does not have channel info
  } : transcriptData ;

  // Word-based sentiment stats for both modes
  useEffect(() => {
    const segments = mode === "live" ? liveSegments : transcriptData?.segments;
    if (!segments || !word.trim()) {
      setWordStats({ positive: 0, neutral: 0, negative: 0, total: 0 });
      return;
    }
    const w = word.trim().toLowerCase();
    let stats = { positive: 0, neutral: 0, negative: 0, total: 0 };
    segments.forEach(seg => {
      const count = (seg.text.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
      if (count > 0) {
        stats[seg.sentiment] += count;
        stats.total += count;
      }
    });
    setWordStats(stats);
  }, [transcriptData, liveSegments, word, mode]);

  function highlightWord(text, word) {
    if (!word) return text;
    const regex = new RegExp(`(${word})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === word.toLowerCase()
        ? <span key={i} className="bg-yellow-300 text-black font-bold rounded px-1">{part}</span>
        : part
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-4 md:p-8 flex flex-col items-center text-white">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-lg">
            <span role="img" aria-label="mic">🎤</span> YouTube Transcript & Sentiment Analyzer
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-medium">
            Analyze any YouTube video's transcript and get detailed sentiment analysis.<br />
            <span className="text-blue-300">Let your words paint the emotion!</span>
          </p>
        </div>

        {/* Show channel info if available */}
        {channelInfo.channelName && (
          <div className="mb-4 flex items-center gap-2 justify-center">
            <span className="text-blue-300 font-semibold">Channel:</span>
            {channelInfo.channelUrl ? (
              <a
                href={channelInfo.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-bold"
              >
                {channelInfo.channelName}
              </a>
            ) : (
              <span className="text-white font-bold">{channelInfo.channelName}</span>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800/80 rounded-lg p-1 flex shadow-lg">
            <button
              onClick={() => setMode("recorded")}
              className={`px-4 py-2 rounded-md transition-all duration-150 ${
                mode === "recorded" ? "bg-blue-600 shadow-md scale-105" : "hover:bg-gray-700"
              }`}
            >
              Recorded Video
            </button>
            <button
              onClick={() => setMode("live")}
              className={`px-4 py-2 rounded-md transition-all duration-150 ${
                mode === "live" ? "bg-blue-600 shadow-md scale-105" : "hover:bg-gray-700"
              }`}
            >
              Live Stream
            </button>
          </div>
        </div>

        {/* Input area */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-6 w-full">
          <input
            type="text"
            placeholder={`Paste YouTube ${mode === "live" ? "Live" : ""} URL here...`}
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="flex-1 rounded-lg p-4 text-black text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
          />

          {mode === "recorded" ? (
            <button
              onClick={handleTranscribe}
              disabled={loading}
              className="px-8 py-3 text-lg font-bold rounded-lg transition-all bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Analyze Video
                </>
              )}
            </button>
          ) : (
            <button
              onClick={ws ? stopLiveTranscription : startLiveTranscription}
              disabled={liveStatus === "connecting"}
              className={`px-8 py-3 text-lg font-bold rounded-lg transition-all shadow-lg flex items-center gap-2 ${
                ws
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } ${
                liveStatus === "connecting" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {liveStatus === "connecting" ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : ws ? (
                "Stop Live"
              ) : (
                "Start Live"
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-600/90 rounded-lg px-4 py-3 max-w-4xl w-full text-center font-semibold backdrop-blur-sm shadow-md animate-pulse border border-red-400">
            {error}
          </div>
        )}

        {/* Word-based sentiment analysis for both modes */}
        {(mode === "recorded" && transcriptData) || (mode === "live" && liveSegments.length > 0) ? (
          <div className="mt-8 bg-white/10 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-blue-200 flex items-center gap-2">
              <svg className="h-6 w-6 text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M12 4v16m0 0H3"></path></svg>
              Word-based Sentiment Analysis
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
              <input
                type="text"
                placeholder="Enter a word or phrase (case-insensitive)"
                value={word}
                onChange={e => setWord(e.target.value)}
                className="rounded-lg p-3 text-black text-lg font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-lg w-full md:w-96"
              />
              {wordStats.total > 0 && (
                <div className="flex flex-col md:flex-row gap-2 items-center">
                  <span className="text-base text-white font-semibold">Occurrences:</span>
                  <span className="px-3 py-1 rounded-full bg-green-900/60 text-green-300 font-bold">
                    Positive: {wordStats.positive}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-700/60 text-gray-300 font-bold">
                    Neutral: {wordStats.neutral}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-900/60 text-red-300 font-bold">
                    Negative: {wordStats.negative}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-yellow-400/80 text-black font-bold">
                    Total: {wordStats.total}
                  </span>
                </div>
              )}
              {wordStats.total === 0 && word && (
                <span className="text-yellow-200 font-semibold">No occurrences found.</span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-4 bg-gray-900/60 rounded-lg whitespace-pre-wrap font-medium text-gray-200 text-base leading-relaxed shadow-inner">
              {(mode === "recorded" ? transcriptData.segments : liveSegments).map((seg, idx) => (
                <div key={idx} className="mb-3">
                  <span className="font-mono text-xs text-cyan-400">{seg.startTime} - {seg.endTime}</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold uppercase ${
                    seg.sentiment === "positive"
                      ? "bg-green-900/60 text-green-300"
                      : seg.sentiment === "neutral"
                      ? "bg-gray-700/60 text-gray-300"
                      : "bg-red-900/60 text-red-300"
                  }`}>
                    {seg.sentiment}
                  </span>
                  <div className="mt-1">
                    {highlightWord(seg.text, word)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {displayData && (
          <div className="mt-12 w-full bg-white/10 rounded-2xl p-6 space-y-8 shadow-2xl backdrop-blur-xl border border-white/20">
            {/* Channel Name Display */}
            {displayData.channelName && (
              <div className="mb-2">
                <span className="text-blue-300 font-semibold">Channel: </span>
                {displayData.channelUrl ? (
                  <a
                    href={displayData.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline font-bold"
                  >
                    {displayData.channelName}
                  </a>
                ) : (
                  <span className="text-white font-bold">{displayData.channelName}</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800/70 p-4 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-gray-400 font-medium mb-2">Detected Language</h3>
                <p className="text-2xl font-bold text-white tracking-wide">en</p>
              </div>
              <div className="bg-gray-800/70 p-4 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-gray-400 font-medium mb-2">Overall Sentiment</h3>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-4 h-4 rounded-full`}
                    style={{
                      backgroundColor: sentimentColors[displayData.overallSentiment],
                    }}
                  ></span>
                  <span className="text-2xl font-bold capitalize">
                    {displayData.overallSentiment}
                  </span>
                </div>
              </div>
              <div className="bg-gray-800/70 p-4 rounded-xl shadow-lg flex flex-col items-center">
                <h3 className="text-gray-400 font-medium mb-2">
                  {mode === "live" ? "Chunks Processed" : "Segments Analyzed"}
                </h3>
                <p className="text-2xl font-bold text-white">
                  {displayData.segments.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-black/40 rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                      </svg>
                      Transcript
                    </h2>
                    <button
                      onClick={downloadTranscript}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-4 bg-gray-900/60 rounded-lg whitespace-pre-wrap font-medium text-gray-200 text-base leading-relaxed shadow-inner">
                    {displayData.transcriptText ||
                      (mode === "live"
                        ? "Live transcription will appear here..."
                        : "No transcript available")}
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {mode === "live" ? "Live Chunks" : "Sentiment Segments"}
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {displayData.segments.map((seg, idx) => (
                      <div
                        key={seg._id || idx}
                        className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-800/60 hover:bg-gray-700/60 rounded-lg p-3 transition-colors shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-cyan-400">
                              {seg.startTime} - {seg.endTime}
                            </span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: sentimentColors[seg.sentiment],
                              }}
                            ></span>
                          </div>
                          <p className="text-gray-200">{seg.text}</p>
                        </div>
                        <div className="mt-2 md:mt-0 md:ml-4 flex-shrink-0">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              seg.sentiment === "positive"
                                ? "bg-green-900/60 text-green-300"
                                : seg.sentiment === "neutral"
                                ? "bg-gray-700/60 text-gray-300"
                                : "bg-red-900/60 text-red-300"
                            }`}
                          >
                            {seg.sentiment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-black/40 rounded-xl p-4 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    Sentiment Distribution
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSentimentData(displayData.segments)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {getSentimentData(displayData.segments).map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            borderColor: "#374151",
                            borderRadius: "0.5rem",
                            color: "#F3F4F6",
                          }}
                          formatter={(value, name) => [value, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Sentiment Breakdown
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getSentimentData(displayData.segments)}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#9CA3AF"
                          tick={{ fill: "#9CA3AF" }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: "#9CA3AF" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            borderColor: "#374151",
                            borderRadius: "0.5rem",
                            color: "#F3F4F6",
                          }}
                        />
                        <Bar dataKey="value">
                          {getSentimentData(displayData.segments).map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}