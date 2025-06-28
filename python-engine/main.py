import sys
from utils import download_audio, split_audio_into_chunks
from transcription import transcribe_chunks
import os
from dotenv import load_dotenv
import time
import json
import traceback
from textblob import TextBlob
from langdetect import detect
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()
api_key = os.getenv("ASSEMBLYAI_API_KEY")

def get_unique_filename():
    timestamp = int(time.time())
    return f"transcript_{timestamp}.txt"

def analyze_sentiment(text):
    """Returns polarity-based sentiment"""
    polarity = TextBlob(text).sentiment.polarity
    if polarity > 0.1:
        return "positive"
    elif polarity < -0.1:
        return "negative"
    else:
        return "neutral"

def segment_text(full_text, segment_size=3):
    """Splits full text into segments (simulating time slots)"""
    sentences = full_text.strip().split(". ")
    segments = []
    start = 0
    for i in range(0, len(sentences), segment_size):
        chunk = ". ".join(sentences[i:i + segment_size]).strip()
        if not chunk:
            continue
        end = start + 30  # Simulate 30 sec blocks
        sentiment = analyze_sentiment(chunk)
        segments.append({
            "startTime": f"{start//60:02d}:{start%60:02d}",
            "endTime": f"{end//60:02d}:{end%60:02d}",
            "text": chunk,
            "sentiment": sentiment
        })
        start = end
    return segments

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "You must provide a YouTube URL as a command-line argument"}))
        sys.exit(1)

    youtube_url = sys.argv[1]

    try:
        print("[1] Downloading audio...", file=sys.stderr)
        download_audio(youtube_url)

        print("[2] Splitting audio into 1-min chunks...", file=sys.stderr)
        split_audio_into_chunks()

        print("[3] Transcribing chunks...", file=sys.stderr)
        full_transcript = transcribe_chunks()

        print("[4] Segmenting and analyzing sentiment...", file=sys.stderr)
        segments = segment_text(full_transcript)
        all_sentiments = [s["sentiment"] for s in segments]
        overall_sentiment = max(set(all_sentiments), key=all_sentiments.count)

        language = detect(full_transcript)

        print(json.dumps({
            "transcript": full_transcript.strip(),
            "segments": segments,
            "overallSentiment": overall_sentiment,
            "language": language
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
