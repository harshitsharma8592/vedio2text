const mongoose = require("mongoose");

const SegmentSchema = new mongoose.Schema({
  startTime: String,
  endTime: String,
  text: String,
  sentiment: String,
});

const TranscriptSchema = new mongoose.Schema({
  youtubeUrl: { type: String, required: true },
  transcriptText: { type: String, required: true },
  segments: [SegmentSchema],
  overallSentiment: { type: String },
  language: { type: String }, // Add this line
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Transcript", TranscriptSchema);
