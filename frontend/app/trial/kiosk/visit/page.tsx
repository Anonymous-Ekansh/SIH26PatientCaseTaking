"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, ArrowLeft, CheckCircle2, Play, Square, X } from "lucide-react";
import { useLanguage } from "@/app/lib/language-context";

export default function VisitKiosk() {
  const router = useRouter();
  const { language } = useLanguage();
  const [visit, setVisit] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answersByTemplate, setAnswersByTemplate] = useState<Record<string, Record<string, any>>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("kiosk_token");
    if (!token) {
      router.push("/trial/kiosk");
      return;
    }
    const isDemoMode = localStorage.getItem("kiosk_demo_mode") === "true";
    if (isDemoMode) {
      const syntheticVisit = { id: "visit-123", name: "V1 - Baseline", scheduled_on: new Date().toISOString() };
      const syntheticTemplates = [
        { id: "t1", kind: "visit", name: "Visit Questionnaire", questions: [ { id: "q1", type: "scale", text_en: "Knee pain level (1-10)?", text_hi: "घुटने के दर्द का स्तर (1-10)?" } ] }
      ];
      setVisit(syntheticVisit);
      setTemplates(syntheticTemplates);
      setQuestions(syntheticTemplates[0].questions.map(q => ({...q, template_id: "t1", kind: "visit"})));
      setAnswersByTemplate({ t1: {} });
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/ct/kiosk/next_visit`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) {
        if(res.status === 404) throw new Error("No scheduled visit found for today.");
        throw new Error("Failed to load visit");
      }
      return res.json();
    })
    .then(data => {
      setVisit(data.visit);
      setTemplates(data.templates);
      
      const allQ: any[] = [];
      const tempAns: any = {};
      data.templates.forEach((t: any) => {
        tempAns[t.id] = {};
        if (t.questions) {
          t.questions.forEach((q: any) => {
            allQ.push({ ...q, template_id: t.id, kind: t.kind });
          });
        }
      });
      setQuestions(allQ);
      setAnswersByTemplate(tempAns);
      setLoading(false);

      if (allQ.length > 0) {
        playAudio(getQuestionText(allQ[0]));
      }
    })
    .catch(e => {
      alert(e.message);
      router.push("/trial/kiosk/menu");
    });
  }, [router]);

  const getQuestionText = (q: any) => {
    return language === 'hi' ? q.text_hi : q.text_en;
  };

  const playAudio = async (textToPlay: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/conversation/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToPlay, language: language }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (error) {
      console.error(error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        await transcribeAudio(audioBlob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsListening(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsListening(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.wav");
      formData.append("language", language);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/conversation/asr`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("ASR failed");
      const data = await res.json();
      if (data.text) {
        setDraftTranscript(data.text);
        setShowReview(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveAnswerAndNext = async (value: any, source: 'voice' | 'touch') => {
    const q = questions[currentIdx];
    
    // Update local state
    const newAnswersByTemplate = { ...answersByTemplate };
    newAnswersByTemplate[q.template_id] = { ...newAnswersByTemplate[q.template_id], [q.id]: value };
    setAnswersByTemplate(newAnswersByTemplate);

    // If it's a side effect question, trigger the flag check
    if (q.kind === 'side_effects' && typeof value === 'string' && value.length > 2) {
      try {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/ct/adverse/check_flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participant_id: visit.participant_id,
            visit_id: visit.id,
            question_text: getQuestionText(q),
            answer_text: value
          })
        }); // Fire and forget
      } catch (e) {
        console.error(e);
      }
    }

    setShowReview(false);
    setDraftTranscript("");

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      playAudio(getQuestionText(questions[currentIdx + 1]));
    } else {
      // Finished all questions, submit each template
      try {
        const token = localStorage.getItem("kiosk_token");
        for (const template of templates) {
          if (Object.keys(newAnswersByTemplate[template.id]).length > 0) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/ct/kiosk/visit_response`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
              },
              body: JSON.stringify({
                visit_id: visit.id,
                form_template_id: template.id,
                answers: newAnswersByTemplate[template.id],
                source
              })
            });
          }
        }
        setIsFinished(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-2xl font-bold">Loading...</div>;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 size={120} className="text-emerald-500 mb-8" />
        <h1 className="text-5xl font-black text-slate-900 mb-6">Thank You!</h1>
        <p className="text-2xl text-slate-600 mb-12">Your responses have been recorded. Your coordinator will confirm your visit.</p>
        <button 
          onClick={() => router.push("/trial/kiosk/menu")}
          className="px-12 py-6 bg-slate-900 text-white text-2xl font-bold rounded-2xl hover:bg-slate-800"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 items-center">
      <div className="w-full max-w-4xl flex items-center mb-12">
        <button onClick={() => router.push("/trial/kiosk/menu")} className="text-slate-500 p-4 border border-slate-300 rounded-full hover:bg-slate-200">
          <ArrowLeft size={32} />
        </button>
        <div className="flex-1 text-center font-bold text-slate-400 text-xl tracking-widest uppercase">
          Visit Questionnaire - Question {currentIdx + 1} of {questions.length}
        </div>
        <div className="w-16"></div>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 h-2 bg-sky-500 transition-all" style={{ width: `${((currentIdx) / questions.length) * 100}%` }}></div>
        
        <div className="mb-12">
          <button onClick={() => playAudio(getQuestionText(q))} className="mx-auto mb-8 w-20 h-20 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
            <Play size={40} className="ml-2" />
          </button>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            {getQuestionText(q)}
          </h2>
        </div>

        {showReview ? (
          <div className="bg-emerald-50 p-8 rounded-2xl border-2 border-emerald-200">
            <p className="text-xl text-emerald-800 font-medium mb-6">" {draftTranscript} "</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => { setDraftTranscript(""); setShowReview(false); }} className="px-8 py-4 bg-white text-slate-700 font-bold border-2 border-slate-300 rounded-xl text-xl hover:bg-slate-100">
                <X size={24} className="inline mr-2" /> Edit
              </button>
              <button onClick={() => saveAnswerAndNext(draftTranscript, 'voice')} className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl text-xl hover:bg-emerald-700">
                <CheckCircle2 size={24} className="inline mr-2" /> Correct
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {q.type === 'multiple_choice' || q.type === 'boolean' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {q.options?.map((opt: string) => (
                  <button 
                    key={opt}
                    onClick={() => saveAnswerAndNext(opt, 'touch')}
                    className="p-8 text-2xl font-bold bg-white border-4 border-slate-200 rounded-2xl hover:border-sky-500 hover:bg-sky-50 transition-all active:scale-95 text-slate-800"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <button 
                  onClick={isListening ? stopRecording : startRecording}
                  className={`w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all border-8 ${
                    isListening ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-sky-50 border-sky-100 text-sky-600 hover:bg-sky-100 hover:scale-105'
                  }`}
                >
                  {isListening ? <Square size={64} className="mb-2" /> : <Mic size={64} className="mb-2" />}
                  <span className="text-xl font-bold uppercase tracking-widest">{isListening ? 'Stop' : 'Speak'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
