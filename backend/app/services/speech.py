import base64
import json
import httpx
from app.config import CONVERSATION_SARVAM_API_KEY


class SpeechError(Exception):
    pass


async def sarvam_tts(text: str) -> bytes:
    """
    Convert text to speech using Sarvam's bulbul:v3 model.
    Returns the raw WAV audio bytes.
    """
    if not CONVERSATION_SARVAM_API_KEY:
        raise SpeechError("CONVERSATION_SARVAM_API_KEY is not configured")

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "API-Subscription-Key": CONVERSATION_SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": [text],
        "target_language_code": "hi-IN",
        "speaker": "ritu",
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.5,
        "speech_sample_rate": 8000,
        "enable_preprocessing": True,
        "model": "bulbul:v3"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            
        if resp.status_code != 200:
            raise SpeechError(f"Sarvam TTS API error: {resp.status_code} - {resp.text}")
            
        data = resp.json()
        if "audios" not in data or not data["audios"]:
            raise SpeechError("No audio returned from Sarvam TTS")
            
        base64_audio = data["audios"][0]
        return base64.b64decode(base64_audio)
        
    except Exception as e:
        raise SpeechError(f"Failed to generate speech: {str(e)}")


async def sarvam_asr(audio_bytes: bytes) -> str:
    """
    Convert speech to English text using Sarvam's saaras:v3 model (Translate endpoint).
    """
    if not CONVERSATION_SARVAM_API_KEY:
        raise SpeechError("CONVERSATION_SARVAM_API_KEY is not configured")

    url = "https://api.sarvam.ai/speech-to-text-translate"
    headers = {
        "API-Subscription-Key": CONVERSATION_SARVAM_API_KEY
    }
    
    # We must send it as a multipart/form-data file
    files = {
        "file": ("recording.wav", audio_bytes, "audio/wav")
    }
    data = {
        "prompt": "",
        "model": "saaras:v3"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            
        if resp.status_code != 200:
            raise SpeechError(f"Sarvam ASR API error: {resp.status_code} - {resp.text}")
            
        resp_data = resp.json()
        # The API returns {"transcript": "..."}
        return resp_data.get("transcript", "")
        
    except Exception as e:
        raise SpeechError(f"Failed to transcribe speech: {str(e)}")
