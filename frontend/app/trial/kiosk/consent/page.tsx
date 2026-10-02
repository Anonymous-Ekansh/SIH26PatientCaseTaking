"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, ArrowLeft, CheckCircle2, Play, Square, FileText } from "lucide-react";
import { useLanguage } from "../../../../lib/language-context";

export default function ConsentKiosk() {
  const router = useRouter();
  const { language } = useLanguage();
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0: Read/Listen, 1: Quiz 1, 2: Quiz 2, 3: Agree, 4: Done
  const [readAloudUsed, setReadAloudUsed] = useState(false);
  
  // Audio state
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("kiosk_token");
    if (!token) {
      router.push("/trial/kiosk");
      return;
    }
    fetch("http://localhost:8000/api/ct/kiosk/consent", {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Could not load consent");
      return res.json();
    })
    .then(data => {
      setVersion(data);
      setLoading(false);
    })
    .catch(e => {
      alert(e.message);
      router.push("/trial/kiosk/menu");
    });
  }, [router]);

  const getText = () => {
    if (!version) return "";
    return language === 'hi' ? version.content_hi : version.content_en;
  };

  const toggleReadAloud = async () => {
    if (isPlaying && audioEl) {
      audioEl.pause();
      setIsPlaying(false);
      return;
    }
    setReadAloudUsed(true);
    setIsPlaying(true);
    try {
      const res = await fetch("http://localhost:8000/api/conversation/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: getText(), language: language }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setAudioEl(audio);
      audio.onended = () => setIsPlaying(false);
      audio.play();
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const submitConsent = async (method: 'touch' | 'voice') => {
    try {
      const token = localStorage.getItem("kiosk_token");
      await fetch("http://localhost:8000/api/ct/kiosk/consent", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          version_id: version.id,
          method,
          read_aloud: readAloudUsed
        })
      });
      setStep(4); // Done
    } catch (e) {
      console.error(e);
      alert("Failed to save consent");
    }
  };

  const handleQuiz = (correct: boolean) => {
    if (!correct) {
      alert(language === 'hi' ? "यह उत्तर सही नहीं है। कृपया सहमति पत्र को दोबारा पढ़ें।" : "That is incorrect. Please read the consent again.");
      setStep(0);
    } else {
      setStep(s => s + 1);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-2xl font-bold">Loading...</div>;

  if (step === 4) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 size={120} className="text-emerald-500 mb-8" />
        <h1 className="text-5xl font-black text-slate-900 mb-6">Consent Signed</h1>
        <p className="text-2xl text-slate-600 mb-12">Thank you, your e-consent has been securely recorded.</p>
        <button onClick={() => router.push("/trial/kiosk/menu")} className="px-12 py-6 bg-slate-900 text-white text-2xl font-bold rounded-2xl hover:bg-slate-800">
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 items-center">
      <div className="w-full max-w-5xl flex items-center justify-between mb-8">
        <button onClick={() => router.push("/trial/kiosk/menu")} className="text-slate-500 p-4 border border-slate-300 rounded-full hover:bg-slate-200">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <FileText size={28} /> {language === 'hi' ? 'ई-सहमति' : 'E-Consent'}
        </h1>
        <div className="w-16"></div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 text-center relative overflow-hidden flex-1">
        
        {step === 0 && (
          <div className="flex flex-col h-full">
            <button 
              onClick={toggleReadAloud} 
              className={`mx-auto mb-8 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                isPlaying ? 'bg-amber-100 text-amber-600 border-4 border-amber-200 animate-pulse' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
              }`}
            >
              {isPlaying ? <Square size={32} /> : <Play size={32} className="ml-2" />}
              <span className="text-sm font-bold mt-1 uppercase">{isPlaying ? 'Stop' : 'Read Aloud'}</span>
            </button>

            <div className="flex-1 overflow-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left mb-8 max-h-[50vh]">
              <p className="text-xl md:text-2xl text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {getText()}
              </p>
            </div>

            <button 
              onClick={() => { if(audioEl) audioEl.pause(); setStep(1); }}
              className="w-full max-w-lg mx-auto py-5 bg-sky-600 text-white text-2xl font-black rounded-2xl hover:bg-sky-700 active:scale-95 transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col h-full justify-center">
            <h2 className="text-3xl font-black text-slate-900 mb-12 leading-tight">
              {language === 'hi' ? "प्रश्न 1: क्या यह परीक्षण आपके ठीक होने की गारंटी देता है?" : "Question 1: Does this trial guarantee a cure?"}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <button onClick={() => handleQuiz(false)} className="p-8 text-2xl font-bold bg-white border-4 border-slate-200 rounded-2xl hover:border-sky-500 hover:bg-sky-50">
                {language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
              </button>
              <button onClick={() => handleQuiz(true)} className="p-8 text-2xl font-bold bg-white border-4 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50">
                {language === 'hi' ? 'नहीं (No)' : 'No'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-full justify-center">
            <h2 className="text-3xl font-black text-slate-900 mb-12 leading-tight">
              {language === 'hi' ? "प्रश्न 2: क्या आप अपनी इच्छानुसार किसी भी समय परीक्षण छोड़ सकते हैं?" : "Question 2: Are you free to leave the trial at any time?"}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <button onClick={() => handleQuiz(true)} className="p-8 text-2xl font-bold bg-white border-4 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50">
                {language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
              </button>
              <button onClick={() => handleQuiz(false)} className="p-8 text-2xl font-bold bg-white border-4 border-slate-200 rounded-2xl hover:border-sky-500 hover:bg-sky-50">
                {language === 'hi' ? 'नहीं (No)' : 'No'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col h-full justify-center">
            <h2 className="text-4xl font-black text-slate-900 mb-4 leading-tight">
              {language === 'hi' ? "मैं सहमत हूँ" : "I Agree"}
            </h2>
            <p className="text-xl text-slate-500 mb-12">
              {language === 'hi' 
                ? "क्या आप स्वेच्छा से इस परीक्षण में भाग लेने के लिए सहमत हैं?" 
                : "Do you voluntarily agree to participate in this clinical trial?"}
            </p>
            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto w-full">
              <button onClick={() => submitConsent('touch')} className="p-8 flex flex-col items-center justify-center text-2xl font-bold bg-emerald-50 border-4 border-emerald-200 text-emerald-700 rounded-3xl hover:border-emerald-500 hover:bg-emerald-100">
                <CheckCircle2 size={64} className="mb-4" />
                Tap to Agree
              </button>
              <button onClick={() => submitConsent('voice')} className="p-8 flex flex-col items-center justify-center text-2xl font-bold bg-sky-50 border-4 border-sky-200 text-sky-700 rounded-3xl hover:border-sky-500 hover:bg-sky-100">
                <Mic size={64} className="mb-4" />
                Say "I Agree"
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
