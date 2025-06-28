const mongoose = require("mongoose");

const SegmentSchema = new mongoose.Schema({
  startTime: String,
  endTime: String,
  text: String,
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
    default: "neutral"
  },
  _id: false
});

const TranscriptSchema = new mongoose.Schema({
  youtubeUrl: { type: String, required: true, trim: true },
  transcriptText: { type: String, required: true },
  segments: [SegmentSchema],
  overallSentiment: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" },
  language: { type: String, required: true, default: "unknown" },
  channelName: { type: String, default: "Unknown" },
  channelUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transcript", TranscriptSchema);