import sys, os, json, time, signal, shutil, subprocess
from datetime import datetime
from dotenv import load_dotenv
from textblob import TextBlob
import requests
from langdetect import detect

load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
SEGMENT_DURATION = "30"
COOKIES_FILE = os.getenv("COOKIES_FILE", "cookies.txt")  # Add this line

def log(msg): print(f"LOG: [{datetime.now().isoformat()}] {msg}", flush=True)

def analyze_sentiment(text):
    polarity = TextBlob(text).sentiment.polarity
    return "positive" if polarity > 0.1 else "negative" if polarity < -0.1 else "neutral"

def transcribe_audio(file_path):
    headers = {"authorization": ASSEMBLYAI_API_KEY}
    with open(file_path, "rb") as f:
        res = requests.post("https://api.assemblyai.com/v2/upload", headers=headers, data=f)
    res.raise_for_status()
    audio_url = res.json()["upload_url"]

    res = requests.post("https://api.assemblyai.com/v2/transcript",
        headers={**headers, "content-type": "application/json"},
        json={"audio_url": audio_url, "language_detection": True}
    )
    res.raise_for_status()
    transcript_id = res.json()["id"]

    while True:
        poll = requests.get(f"https://api.assemblyai.com/v2/transcript/{transcript_id}", headers=headers)
        status = poll.json()
        if status["status"] == "completed":
            return status["text"]
        elif status["status"] == "error":
            raise Exception("AssemblyAI failed")
        time.sleep(3)

def process_stream(youtube_url, session_id):
    temp_dir = os.path.abspath(os.path.join("temp_live_chunks", session_id))
    os.makedirs(temp_dir, exist_ok=True)

    output_template = os.path.join(temp_dir, "chunk_%03d.mp3")

    yt_dlp_cmd = [
        "yt-dlp", "-f", "94", "--no-playlist", 
        "--cookies", COOKIES_FILE,  # Add cookies parameter
        "-o", "-", youtube_url
    ]
    ffmpeg_cmd = [
        "ffmpeg", "-i", "pipe:0",
        "-vn", "-acodec", "libmp3lame", "-ar", "44100", "-ac", "2",
        "-b:a", "128k", "-f", "segment", "-segment_time", SEGMENT_DURATION,
        "-loglevel", "info", output_template
    ]

    log(f"Launching yt-dlp + FFmpeg pipeline...")
    yt_proc = subprocess.Popen(yt_dlp_cmd, stdout=subprocess.PIPE)
    ff_proc = subprocess.Popen(ffmpeg_cmd, stdin=yt_proc.stdout)

    processed = set()
    running = True
    last_success = time.time()

    try:
        while running:
            time.sleep(1)
            files = sorted(f for f in os.listdir(temp_dir) if f.endswith(".mp3"))
            log(f"Found files: {files}")
            new_files = [f for f in files if f not in processed]

            for f in new_files:
                path = os.path.join(temp_dir, f)
                log(f"Processing file: {f}")

                # Wait until file is stable
                for _ in range(30):
                    size1 = os.path.getsize(path)
                    time.sleep(0.5)
                    size2 = os.path.getsize(path)
                    if size1 == size2: break

                try:
                    text = transcribe_audio(path)
                    log(f"Transcribed text: {text[:30]}...")
                    sentiment = analyze_sentiment(text)
                    try:
                        language = detect(text)
                    except Exception:
                        language = "unknown"
                    print(json.dumps({
                        "text": text,
                        "timestamp": datetime.now().isoformat(),
                        "sentiment": sentiment,
                        "language": language
                    }), flush=True)
                    processed.add(f)
                    os.remove(path)
                    last_success = time.time()
                except Exception as e:
                    log(f"Error processing {f}: {e}")

            if time.time() - last_success > 120:
                log("Timeout reached. No transcription for 2 minutes.")
                break
    finally:
        yt_proc.terminate()
        ff_proc.terminate()
        shutil.rmtree(temp_dir, ignore_errors=True)
        log("Cleanup done.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "YouTube URL required"}), flush=True)
        sys.exit(1)

    url = sys.argv[1]
    session = sys.argv[2] if len(sys.argv) > 2 else datetime.now().strftime("%Y%m%d%H%M%S")
    process_stream(url, session)