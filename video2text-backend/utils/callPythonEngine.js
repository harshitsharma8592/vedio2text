const path = require("path");
const { spawn } = require("child_process");

exports.runTranscription = (youtubeUrl) => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, "..", "..", "python-engine", "main.py");

    console.log("Running Python script at:", pythonScriptPath);

    const pythonProcess = spawn("python", [pythonScriptPath, youtubeUrl], {
      env: process.env,
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProcess.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProcess.on("close", (code) => {
      if (stderrData) console.error("Python stderr:", stderrData);

      try {
        // Sometimes Python prints logs, so get the last JSON line
        const lines = stdoutData.trim().split("\n");
        const lastLine = lines[lines.length - 1].trim();
        const result = JSON.parse(lastLine);

        if (result.error) return reject(new Error(result.error));
        // result = { transcript, segments, overallSentiment, language }
        resolve(result);
      } catch (err) {
        return reject(
          new Error(
            `Failed to parse transcript from Python output. Raw output:\n${stdoutData}\nError: ${err.message}`
          )
        );
      }
    });
  });
};