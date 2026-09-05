"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { useLanguage } from "../../lib/language-context";

export default function ConversationPage() {
  const { language } = useLanguage();
  const [mode] = useState("Allopathic - General");
  const [response, setResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Derive language display name
  const languageName = language === "hi" ? "Hindi (India)" : "English (English (IN))";

  return (
    <div className="flex flex-col max-w-[800px] mx-auto min-h-[calc(100vh-64px)] p-4 md:p-6 gap-6 font-sans">
      {/* 1. Top row */}
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-xs font-bold border border-sky-100">
            <Shield size={14} />
            <span>{mode}</span>
          </div>

          {/* Language Selector Dropdown Mock */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-colors">
            <Languages size={14} />
            <span>{languageName}</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      {/* 2. Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-sky-500 w-[35%] rounded-full"></div>
      </div>

      {/* 3. Info banner */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-sm font-medium">
        <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
        <p>AI-generated draft, requires healthcare professional review</p>
      </div>

      {/* 4. Question card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            CURRENT QUESTION
          </span>
          <button
            onClick={() => setIsListening(!isListening)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
              isListening
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Volume2 size={16} />
            <span>Listen</span>
          </button>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          [Question will appear here]
        </h2>
      </div>

      {/* 5. Response card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 shadow-sm flex flex-col gap-4">
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response or tap the microphone to speak..."
          className="w-full min-h-[120px] resize-none outline-none text-base text-gray-800 placeholder-gray-400 bg-transparent"
        ></textarea>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => setIsSpeaking(!isSpeaking)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-colors border ${
              isSpeaking
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Mic size={18} />
            <span>Speak</span>
          </button>

          <button
            disabled={!response.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
              response.trim()
                ? "bg-sky-500 text-white hover:bg-sky-600 shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <span>Send Answer</span>
            <Send size={16} className={response.trim() ? "text-white" : "text-gray-400"} />
          </button>
        </div>
      </div>

      {/* 6. Footer row */}
      <footer className="mt-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pb-4">
        <p className="text-sm font-medium text-gray-500">
          You can proceed to document digitization once finished.
        </p>
        <Link
          href="/dashboard/documents"
          className="flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          <span>Proceed to document upload</span>
          <ArrowRight size={18} />
        </Link>
      </footer>
    </div>
  );
}
