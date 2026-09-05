"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import {
  ArrowLeft,
  Shield,
  Languages,
  ChevronDown,
  Info,
  Volume2,
  Send,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "../../lib/language-context";

export default function AyushPage() {
  const { language } = useLanguage();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Current input state
  const [currentTextResponse, setCurrentTextResponse] = useState("");
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);

  const supabase = createClient();
  const languageName = language === "hi" ? "Hindi (India)" : "English (English (IN))";

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function initAyush() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch patient
        const { data: patientData } = await supabase
          .from("patients")
          .select("id, date_of_birth")
          .eq("auth_user_id", user.id)
          .single();
          
        if (patientData) {
          setPatientId(patientData.id);
          
          // Compute age if possible
          if (patientData.date_of_birth) {
            const birthYear = new Date(patientData.date_of_birth).getFullYear();
            const currentYear = new Date().getFullYear();
            setAnswers(prev => ({ ...prev, age: currentYear - birthYear }));
          }

          // Fetch active encounter
          const { data: encounterData } = await supabase
            .from("encounters")
            .select("id")
            .eq("patient_id", patientData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
            
          if (encounterData) {
            setEncounterId(encounterData.id);
          } else {
            // If no encounter exists, we could create one or handle it.
            // But let's assume they should have one.
          }
        }

        // Fetch questions
        const res = await fetch(`${getApiUrl()}/api/ayush/questions`);
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    initAyush();
  }, []);

  const playAudio = async (textToPlay: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/conversation/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToPlay }),
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

  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (isListening && currentQ && currentQ.text) {
      playAudio(currentQ.text);
    }
  }, [currentIndex, isListening, currentQ]);

  const handleListenToggle = () => {
    const newState = !isListening;
    setIsListening(newState);
    if (newState && currentQ && currentQ.text) {
      playAudio(currentQ.text);
    }
  };

  const handleNext = async (val?: any) => {
    if (!currentQ) return;
    
    let finalValue = val;
    if (val === undefined) {
      if (currentQ.multi_select) {
        finalValue = multiSelectValues;
      } else {
        finalValue = currentTextResponse;
        if (finalValue === "" && currentQ.type !== "options") return; // Require answer if typed
      }
    }

    const newAnswers = { ...answers, [currentQ.id]: finalValue };
    setAnswers(newAnswers);
    setCurrentTextResponse("");
    setMultiSelectValues([]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all questions, submit
      await submitAssessment(newAnswers);
    }
  };

  const submitAssessment = async (finalAnswers: any) => {
    setIsLoading(true);
    try {
      if (!encounterId || !patientId) {
        throw new Error("No active patient or encounter found. Please start a conversation first.");
      }

      await fetch(`${getApiUrl()}/api/ayush/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounter_id: encounterId,
          patient_id: patientId,
          answers: finalAnswers
        }),
      });
      setIsFinished(true);
      // Wait a moment then redirect to summary
      setTimeout(() => {
        router.push("/dashboard/summary");
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = questions.length > 0 ? Math.round(((currentIndex) / questions.length) * 100) : 0;

  if (isLoading && questions.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-[800px] mx-auto min-h-[calc(100vh-64px)] p-4 md:p-6 gap-6 font-sans">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
            <Shield size={14} />
            <span>AYUSH Assessment</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-colors">
            <Languages size={14} />
            <span>{languageName}</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {isFinished ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <CheckCircle size={64} className="text-emerald-500" />
          <h2 className="text-2xl font-bold text-gray-800">Assessment Complete</h2>
          <p className="text-gray-500">Redirecting to your clinical summary...</p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-sm font-medium">
            <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <p>Dashavidha Pariksha - Please answer the following questions honestly for an accurate constitution (Prakriti) assessment.</p>
          </div>

          {currentQ && (
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded">
                  {currentQ.section}
                </span>
                <button
                  onClick={handleListenToggle}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                    isListening
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Volume2 size={16} />
                  <span>{isListening ? "Listening..." : "Listen"}</span>
                </button>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
                {currentQ.text}
              </h2>

              {currentQ.options ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {currentQ.options.map((opt: any) => {
                      const isSelected = multiSelectValues.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (currentQ.multi_select) {
                              setMultiSelectValues(prev => 
                                isSelected ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                              );
                            } else {
                              handleNext(opt.value);
                            }
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all font-medium ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                              : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt.label}</span>
                            {currentQ.multi_select && (
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                {isSelected && <CheckCircle size={14} className="text-white" />}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {currentQ.multi_select && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleNext()}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                          !isLoading
                            ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <span>{isLoading ? "Saving..." : "Next"}</span>
                        <Send size={16} className={!isLoading ? "text-white" : "text-gray-400"} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {currentQ.type === "number" ? (
                    <input
                      type="number"
                      value={currentTextResponse}
                      onChange={(e) => setCurrentTextResponse(e.target.value)}
                      placeholder="Enter value..."
                      className="w-full p-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNext();
                      }}
                    />
                  ) : (
                    <textarea
                      value={currentTextResponse}
                      onChange={(e) => setCurrentTextResponse(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full min-h-[120px] p-4 resize-none rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-base"
                    />
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleNext()}
                      disabled={!currentTextResponse.trim() || isLoading}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                        currentTextResponse.trim() && !isLoading
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <span>{isLoading ? "Saving..." : "Next"}</span>
                      <Send size={16} className={currentTextResponse.trim() && !isLoading ? "text-white" : "text-gray-400"} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
