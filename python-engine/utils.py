import os
import subprocess
from yt_dlp import YoutubeDL
import shutil
import stat

def download_audio(youtube_url, output_path="audio.mp3"):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'audio.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    # Rename downloaded file to 'audio.mp3' if needed
    for ext in ['webm', 'm4a', 'mp3']:
        original_file = f"audio.{ext}"
        if os.path.exists(original_file) and original_file != "audio.mp3":
            os.rename(original_file, "audio.mp3")
            break

def remove_readonly(func, path, _):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def split_audio_into_chunks(input_file="audio.mp3", chunk_dir="audio_chunks", chunk_length=60):
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file {input_file} not found.")

    if shutil.which("ffmpeg") is None:
        raise EnvironmentError("ffmpeg is not installed or not found in system PATH.")

    if os.path.exists(chunk_dir):
        shutil.rmtree(chunk_dir, onerror=remove_readonly)

    os.makedirs(chunk_dir, exist_ok=True)

    output_template = os.path.join(chunk_dir, "chunk_%03d.mp3").replace("\\", "/")

    cmd = [
        "ffmpeg",
        "-i", input_file,
        "-f", "segment",
        "-segment_time", str(chunk_length),
        "-c", "copy",
        output_template
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("ffmpeg command failed:\n" + result.stderr)
    return sorted(os.listdir(chunk_dir))
