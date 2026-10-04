// lib/trial/useVoiceKiosk.ts
// Thin adapter to drive the existing voice engine backend without changing MediKiosk behaviour

export const playTTS = async (text: string, language: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/api/conversation/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error("TTS failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
  return audio;
};

export const transcribeASR = async (blob: Blob, language: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const formData = new FormData();
  formData.append("audio", blob, "recording.wav");
  formData.append("language", language);
  const res = await fetch(`${apiUrl}/api/conversation/asr`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("ASR failed");
  const data = await res.json();
  return data.text;
};
