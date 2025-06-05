const Transcript = require("../models/Transcript");
const { runTranscription } = require("../utils/callPythonEngine");

// Create transcript from YouTube URL


// Create transcript from YouTube URL
exports.createTranscript = async (req, res) => {
  const { youtubeUrl } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
  const result = await runTranscription(youtubeUrl);
  // result = { transcript, segments, overallSentiment }

  const transcript = new Transcript({
    youtubeUrl,
    transcriptText: result.transcript,
    segments: result.segments,
    overallSentiment: result.overallSentiment,
    language: result.language || "unknown",
    createdAt: new Date()
  });

  await transcript.save();

  res.status(201).json(transcript);
} catch (error) {
  console.error("Error in createTranscript:", error);
  res.status(500).json({ error: error.message || "Failed to generate transcript" });
}

};


// Get transcript by MongoDB _id
exports.getTranscript = async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id);
    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }
    res.json(transcript);
  } catch (error) {
    console.error("Error in getTranscript:", error.message);
    res.status(500).json({ error: "Failed to retrieve transcript" });
  }
};
