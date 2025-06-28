import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

const COLORS = ["#22c55e", "#eab308", "#ef4444"];
const SENTIMENT_LABELS = ["positive", "neutral", "negative"];

function getSentimentData(segments = []) {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  segments.forEach(s => counts[s.sentiment]++);
  return SENTIMENT_LABELS.map((name, i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: counts[name],
    color: COLORS[i]
  }));
}

// Helper to convert sentiment to a score for line chart
function sentimentToScore(sentiment) {
  if (sentiment === "positive") return 1;
  if (sentiment === "negative") return -1;
  return 0;
}

export default function Dashboard() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch("/api/transcripts")
      .then(res => res.json())
      .then(data => {
        setTranscripts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-white">Loading dashboard...</div>;

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Transcripts Dashboard</h1>
      <table className="w-full bg-gray-800 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-3 text-left">YouTube URL</th>
            <th className="p-3 text-left">Channel</th>
            <th className="p-3 text-left">Language</th>
            <th className="p-3 text-left">Sentiment</th>
            <th className="p-3 text-left">Segments</th>
            <th className="p-3 text-left">Created At</th>
            <th className="p-3 text-left">Details</th>
          </tr>
        </thead>
        <tbody>
          {transcripts.map(t => (
            <React.Fragment key={t._id}>
              <tr className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-3">
                  <a href={t.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    {t.youtubeUrl}
                  </a>
                </td>
                <td className="p-3">
                  {t.channelUrl ? (
                    <a
                      href={t.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 underline"
                    >
                      {t.channelName || "Unknown"}
                    </a>
                  ) : (
                    t.channelName || "Unknown"
                  )}
                </td>
                <td className="p-3">{t.language}</td>
                <td className="p-3 capitalize">{t.overallSentiment}</td>
                <td className="p-3">{t.segments?.length || 0}</td>
                <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <button
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                    onClick={() => setExpanded(expanded === t._id ? null : t._id)}
                  >
                    {expanded === t._id ? "Hide" : "Details"}
                  </button>
                </td>
              </tr>
              {expanded === t._id && (
                <tr>
                  <td colSpan={7} className="bg-gray-900/80 p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1 min-w-[300px]">
                        <h3 className="text-lg font-bold mb-2">Sentiment Pie Chart</h3>
                        <ResponsiveContainer width="100%" height={180}>
  <PieChart>
    {/* Filter only non-zero segments for the pie slices */}
    <Pie
      data={getSentimentData(t.segments).filter(d => d.value > 0)}
      dataKey="value"
      nameKey="name"
      cx="40%"
      cy="50%"
      outerRadius={70}
      label={({ name, percent }) =>
        `${name} ${(percent * 100).toFixed(0)}%`
      }
    >
      {getSentimentData(t.segments)
        .filter(d => d.value > 0)
        .map((entry, i) => (
          <Cell key={entry.name} fill={entry.color} />
        ))}
    </Pie>

    {/* Tooltip works normally */}
    <Tooltip />

    {/* Show legend for all sentiments regardless of 0 values */}
    <Legend
      layout="vertical"
      verticalAlign="middle"
      align="right"
      wrapperStyle={{ paddingLeft: '10px', lineHeight: '24px' }}
      payload={getSentimentData(t.segments).map((entry, i) => ({
        id: entry.name,
        type: "square",
        value: `${entry.name} (${entry.value})`,
        color: entry.color
      }))}
    />
  </PieChart>
</ResponsiveContainer>

                        <h3 className="text-lg font-bold mt-6 mb-2">Sentiment Bar Chart</h3>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={getSentimentData(t.segments)}>
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip />
                            <Bar dataKey="value">
                              {getSentimentData(t.segments).map((entry, i) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <h3 className="text-lg font-bold mt-6 mb-2">Sentiment Trend</h3>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart
                            data={t.segments.map((seg, idx) => ({
                              name: `#${idx + 1}`,
                              score: sentimentToScore(seg.sentiment),
                              sentiment: seg.sentiment,
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis
                              domain={[-1, 1]}
                              ticks={[-1, 0, 1]}
                              allowDataOverflow={true}
                              tickFormatter={v => (v === 1 ? "Positive" : v === -1 ? "Negative" : "Neutral")}
                            />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" dot />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 min-w-[300px]">
                        <h3 className="text-lg font-bold mb-2">Full Transcript</h3>
                        <div className="bg-gray-800 rounded p-4 max-h-72 overflow-y-auto text-gray-200 whitespace-pre-wrap text-base shadow-inner">
                          {t.transcriptText}
                        </div>
                        <h3 className="text-lg font-bold mt-6 mb-2">Segments</h3>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {t.segments?.map((seg, idx) => (
                            <div key={idx} className="p-2 rounded bg-gray-700/60">
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
                              <div className="mt-1">{seg.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}