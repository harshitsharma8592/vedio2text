import os
import requests
import time
from dotenv import load_dotenv
from tqdm import tqdm
import sys
load_dotenv()

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
headers = {
    "authorization": ASSEMBLYAI_API_KEY,
    "content-type": "application/json"
}

def upload_audio(filename):
    """Uploads audio file to AssemblyAI and returns the upload URL"""
    with open(filename, 'rb') as f:
        response = requests.post(
            'https://api.assemblyai.com/v2/upload',
            headers={"authorization": ASSEMBLYAI_API_KEY},
            files={'file': f}
        )
    response.raise_for_status()
    return response.json()['upload_url']

def transcribe_audio(upload_url):
    """Starts transcription job and polls until it's done"""
    endpoint = "https://api.assemblyai.com/v2/transcript"
    json_data = {
        "audio_url": upload_url,
        "language_detection": True,
        "auto_chapters": False,
        "iab_categories": True,
        "entity_detection": True
    }

    response = requests.post(endpoint, json=json_data, headers=headers)
    response.raise_for_status()
    transcript_id = response.json()['id']

    polling_endpoint = f"{endpoint}/{transcript_id}"

    print(" Transcribing...", file=sys.stderr)


    while True:
        polling_response = requests.get(polling_endpoint, headers=headers)
        polling_result = polling_response.json()

        if polling_result['status'] == 'completed':
            print("Transcription completed", file=sys.stderr)

            return polling_result
        elif polling_result['status'] == 'error':
            raise Exception(polling_result.get('error', 'Unknown transcription error'))

        time.sleep(3)

def transcribe_chunks(folder_path='audio_chunks'):
    """Transcribes all audio chunks in the folder and returns concatenated transcript"""
    full_text = ""
    files = sorted(os.listdir(folder_path))
    for file in tqdm(files, desc="Transcribing chunks"):
        if file.endswith(".mp3"):
            file_path = os.path.join(folder_path, file)
            try:
                upload_url = upload_audio(file_path)
                result = transcribe_audio(upload_url)
                full_text += result.get('text', '') + "\n"
            except Exception as e:
                print(f"Error transcribing {file}: {e}")
    return full_text
