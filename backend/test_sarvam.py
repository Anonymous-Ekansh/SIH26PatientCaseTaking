import requests

API_KEY = "sk_7296sm7z_amjHlsc2aKPxxxgKjVY6pUyB"
headers = {"API-Subscription-Key": API_KEY, "Content-Type": "application/json"}

# Test TTS
tts_payload = {
    "inputs": ["Hello"],
    "target_language_code": "hi-IN",
    "speaker": "invalid",
}
resp = requests.post("https://api.sarvam.ai/text-to-speech", headers=headers, json=tts_payload)
print("TTS:", resp.text)
