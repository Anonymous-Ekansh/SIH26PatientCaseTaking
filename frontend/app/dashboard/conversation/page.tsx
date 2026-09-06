"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Shield,
  Languages,
  ChevronDown,
  Info,
  Volume2,
  Mic,
  Send,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "../../lib/language-context";

export default function ConversationPage() {
  const { language } = useLanguage();
  const t = useTranslations("Conversation");
  const [mode] = useState("Allopathic - General");
  const [response, setResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Agent state
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>(t('loading'));
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [redFlag, setRedFlag] = useState(false);
  const [redFlagReasons, setRedFlagReasons] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // ASR State
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const supabase = createClient();

  // Derive language display name
  const languageName = language === "hi" ? "Hindi (India)" : "English (English (IN))";

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  useEffect(() => {
    async function startConversation() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch(`${getApiUrl()}/api/conversation/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_user_id: user.id }),
        });

        if (!res.ok) throw new Error("Failed to start conversation");
        
        const data = await res.json();
        setEncounterId(data.encounter_id);
        
        handleAgentStep(data.step);
      } catch (error) {
        console.error(error);
        setQuestion(t('error_start'));
      } finally {
        setIsLoading(false);
      }
    }

    startConversation();
  }, []);

  // --- TTS LOGIC ---
  const playAudio = async (textToPlay: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/conversation/tts`, {
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

  useEffect(() => {
    if (isListening && question && question !== t('loading') && !question.startsWith("Error") && !question.startsWith(t('error_start').substring(0, 5))) {
      playAudio(question);
    }
  }, [question, isListening]);

  const handleListenToggle = () => {
    const newState = !isListening;
    setIsListening(newState);
    if (newState && question && question !== t('loading') && !question.startsWith("Error") && !question.startsWith(t('error_start').substring(0, 5))) {
      playAudio(question);
    }
  };

  // --- ASR LOGIC ---
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
      setIsSpeaking(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsSpeaking(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.wav");
      formData.append("language", language);
      
      const res = await fetch(`${getApiUrl()}/api/conversation/asr`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("STT failed");
      const data = await res.json();
      if (data.text) {
        setResponse((prev) => prev ? prev + " " + data.text : data.text);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakToggle = () => {
    if (isSpeaking) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAgentStep = (step: any) => {
    if (step.paused) {
      setQuestion(step.question || "Can you tell me more about that?");
      if (step.type === "chief_complaint_request") {
        setProgress(10);
      } else {
        setProgress((prev) => Math.min(prev + 10, 90));
      }
    } else {
      // Finished
      setIsFinished(true);
      setProgress(100);
      const state = step.final_state;
      if (state.red_flag) {
        setRedFlag(true);
        setRedFlagReasons(state.red_flag_reasons || []);
      }
    }
  };

  const handleSend = async () => {
    if (!response.trim() || !encounterId) return;

    const answer = response;
    setResponse("");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(`${getApiUrl()}/api/conversation/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_user_id: user.id,
          encounter_id: encounterId,
          answer: answer,
          language: language
        }),
      });

      if (!res.ok) throw new Error("Failed to send answer");
      
      const step = await res.json();
      handleAgentStep(step);
    } catch (error) {
      console.error(error);
      setQuestion(t('error_send'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-[800px] mx-auto min-h-[calc(100vh-64px)] p-4 md:p-6 gap-6 font-sans">
      {/* 1. Top row */}
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t('back')}</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-xs font-bold border border-sky-100">
            <Shield size={14} />
            <span>{mode}</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-colors">
            <Languages size={14} />
            <span>{languageName}</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      {/* 2. Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-sky-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* 3. Emergency Alert if red flag */}
      {isFinished && redFlag && (
        <div className="flex items-start gap-3 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 shadow-sm">
          <AlertTriangle size={24} className="shrink-0 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">{t('priority_triage')}</h3>
            <p className="text-sm mb-2">{t('priority_desc')}</p>
            <ul className="list-disc pl-5 text-sm font-medium">
              {redFlagReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Interview Finished state */}
      {isFinished && !redFlag && (
        <div className="flex items-start gap-3 p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 shadow-sm">
          <CheckCircle size={24} className="shrink-0 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-green-900 mb-1">{t('interview_complete')}</h3>
            <p className="text-sm">{t('interview_desc')}</p>
          </div>
        </div>
      )}

      {!isFinished && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-sm font-medium">
            <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <p>{t('ai_draft_info')}</p>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t('current_question')}
              </span>
              <button
                onClick={handleListenToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                  isListening
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Volume2 size={16} />
                <span>{isListening ? t('listening') : t('listen')}</span>
              </button>
            </div>
            <h2 className={`text-xl md:text-2xl font-bold text-gray-800 ${isLoading ? 'animate-pulse text-gray-400' : ''}`}>
              {question}
            </h2>
          </div>

          {/* Response card */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 shadow-sm flex flex-col gap-4">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={isLoading}
              placeholder={isLoading ? t('waiting_ai') : t('type_response')}
              className="w-full min-h-[120px] resize-none outline-none text-base text-gray-800 placeholder-gray-400 bg-transparent disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            ></textarea>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={handleSpeakToggle}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-colors border ${
                  isSpeaking
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                }`}
              >
                <Mic size={18} />
                <span>{isSpeaking ? t('stop_speaking') : t('speak')}</span>
              </button>

              <button
                onClick={handleSend}
                disabled={!response.trim() || isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  response.trim() && !isLoading
                    ? "bg-sky-500 text-white hover:bg-sky-600 shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span>{isLoading ? t('sending') : t('send_answer')}</span>
                <Send size={16} className={response.trim() && !isLoading ? "text-white" : "text-gray-400"} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Footer row */}
      <footer className="mt-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pb-4">
        <p className="text-sm font-medium text-gray-500">
          {t('proceed_info')}
        </p>
        <Link
          href="/dashboard/documents"
          className="flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          <span>{t('proceed_link')}</span>
          <ArrowRight size={18} />
        </Link>
      </footer>
    </div>
  );
}
