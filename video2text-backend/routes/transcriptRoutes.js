const express = require("express");
const router = express.Router();
const transcriptController = require("../controllers/transcriptController");

router.post("/", transcriptController.createTranscript);
router.get("/:id", transcriptController.getTranscript);

router.get("/", transcriptController.getAllTranscripts);


module.exports = router;
