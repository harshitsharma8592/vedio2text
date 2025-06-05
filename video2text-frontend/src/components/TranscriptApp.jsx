// File: src/components/TranscriptApp.jsx
import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

export default function TranscriptApp() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcriptData, setTranscriptData] = useState(null);

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
        headers: {
          "Content-Type": "application/json",
        },
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

  const sentimentColors = {
    positive: "#10B981",
    negative: "#EF4444",
    neutral: "#6B7280",
  };

  const getSentimentChartData = () => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    transcriptData?.segments.forEach((seg) => counts[seg.sentiment]++);
    return Object.entries(counts).map(([sentiment, count]) => ({ 
      name: sentiment, 
      value: count,
      color: sentimentColors[sentiment] 
    }));
  };

  const COLORS = ['#10B981', '#6B7280', '#EF4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-4 md:p-8 flex flex-col items-center text-white">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            YouTube Transcript & Sentiment Analyzer
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Analyze any YouTube video's transcript and get detailed sentiment analysis
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Paste YouTube URL here..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="flex-1 rounded-lg p-4 text-black text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
          />
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
        </div>

        {error && (
          <div className="mt-4 bg-red-600/80 rounded-lg px-4 py-3 max-w-4xl w-full text-center font-semibold backdrop-blur-sm shadow-md animate-pulse">
            {error}
          </div>
        )}

        {transcriptData && (
          <div className="mt-12 w-full bg-white/5 rounded-2xl p-6 space-y-8 shadow-xl backdrop-blur-sm border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <h3 className="text-gray-400 font-medium mb-2">Detected Language</h3>
                <p className="text-2xl font-bold text-white">{transcriptData.language}</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <h3 className="text-gray-400 font-medium mb-2">Overall Sentiment</h3>
                <div className="flex items-center gap-3">
                  <span 
                    className={`inline-block w-4 h-4 rounded-full`} 
                    style={{ backgroundColor: sentimentColors[transcriptData.overallSentiment] }}
                  ></span>
                  <span className="text-2xl font-bold capitalize">{transcriptData.overallSentiment}</span>
                </div>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <h3 className="text-gray-400 font-medium mb-2">Segments Analyzed</h3>
                <p className="text-2xl font-bold text-white">{transcriptData.segments.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-black/30 rounded-xl p-4">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                    Transcript
                  </h2>
                  <div className="max-h-64 overflow-y-auto p-4 bg-gray-900/50 rounded-lg whitespace-pre-wrap font-medium text-gray-200 text-sm leading-relaxed">
                    {transcriptData.transcriptText}
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Sentiment Segments
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {transcriptData.segments.map((seg, idx) => (
                      <div
                        key={seg._id || idx}
                        className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-3 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-cyan-400">{seg.startTime} - {seg.endTime}</span>
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: sentimentColors[seg.sentiment] }}
                            ></span>
                          </div>
                          <p className="text-gray-200">{seg.text}</p>
                        </div>
                        <div className="mt-2 md:mt-0 md:ml-4 flex-shrink-0">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${seg.sentiment === 'positive' ? 'bg-green-900/50 text-green-300' : seg.sentiment === 'neutral' ? 'bg-gray-700/50 text-gray-300' : 'bg-red-900/50 text-red-300'}`}
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
                <div className="bg-black/30 rounded-xl p-4">
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
                          data={getSentimentChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getSentimentChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937',
                            borderColor: '#374151',
                            borderRadius: '0.5rem',
                            color: '#F3F4F6'
                          }}
                          formatter={(value, name) => [value, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Sentiment Breakdown
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getSentimentChartData()}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937',
                            borderColor: '#374151',
                            borderRadius: '0.5rem',
                            color: '#F3F4F6'
                          }}
                        />
                        <Bar dataKey="value">
                          {getSentimentChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
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