import requests

API_KEY = "sk_7296sm7z_amjHlsc2aKPxxxgKjVY6pUyB"
headers = {"API-Subscription-Key": API_KEY}
files = {"file": ("test.wav", b"dummy_audio_bytes", "audio/wav")}

resp = requests.post("https://api.sarvam.ai/speech-to-text-translate", headers=headers, files=files, data={"prompt": "", "model": "saaras:v1"})
print("STT Translate:", resp.status_code, resp.text)

resp = requests.post("https://api.sarvam.ai/speech-to-text", headers=headers, files=files, data={"prompt": "", "model": "saaras:v1"})
print("STT:", resp.status_code, resp.text)
