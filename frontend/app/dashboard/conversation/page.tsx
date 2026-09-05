"use client";

import { useState } from "react";
import { Mic, Upload, AlertTriangle } from "lucide-react";

export default function ConversationPage() {
  const [micActive, setMicActive] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);

  const placeholderChips = [
    "Option A",
    "Option B",
    "Option C",
    "Option D",
  ];

  return (
    <div className="flex flex-col max-w-[600px] mx-auto min-h-[calc(100vh-64px)]">
      <main className="flex-1 flex flex-col p-5">
        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                n === 1
                  ? "bg-[#0EA5E9] text-white"
                  : "border border-[#E5E7EB] text-[#6B7280] bg-white"
              }`}
            >
              {n}
            </div>
          ))}
        </div>

        {/* Question card */}
        <div className="bg-[#F5F5F5] rounded-2xl p-6 md:p-8 mb-10 text-center border border-[#E5E7EB]">
          <span className="inline-block text-xs font-bold text-[#0EA5E9] bg-white px-2.5 py-1 rounded-md uppercase tracking-wider mb-4 border border-[#E5E7EB]">
            Chief Complaint
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-[#6B7280] mb-2">
            [Question will appear here]
          </h2>
          <p className="text-[#6B7280] text-sm">
            Questions will be generated based on your responses
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Mic button */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative">
              {micActive && (
                <div className="absolute inset-0 bg-[#0EA5E9] rounded-full animate-ping opacity-50" />
              )}
              <button
                onClick={() => setMicActive(!micActive)}
                className={`relative z-10 w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  micActive
                    ? "bg-[#DC2626] shadow-lg"
                    : "bg-[#0EA5E9] hover:bg-sky-600"
                }`}
              >
                <Mic size={36} className="text-white" />
              </button>
            </div>
            <p className="text-[#6B7280] text-sm mt-5 text-center max-w-[220px]">
              {micActive
                ? "Listening... Tap to stop"
                : "Tap to speak, or choose an option below"}
            </p>
          </div>

          {/* Quick reply chips */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {placeholderChips.map((label, i) => (
              <button
                key={i}
                onClick={() => setSelectedChip(selectedChip === i ? null : i)}
                className={`flex items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-[0.98] min-h-[72px] font-semibold ${
                  selectedChip === i
                    ? "border-[#0EA5E9] bg-[#0EA5E9] text-white"
                    : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-sky-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom row */}
      <footer className="p-5 border-t border-[#E5E7EB] flex items-center gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#E5E7EB] text-[#6B7280] font-semibold text-sm hover:bg-[#F5F5F5] transition-colors min-h-[56px]">
          <Upload size={18} />
          <span>Upload document</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-100 text-[#DC2626] bg-red-50 font-semibold text-sm hover:bg-red-100 transition-colors min-h-[56px]">
          <AlertTriangle size={18} />
          <span>Need help now</span>
        </button>
      </footer>
    </div>
  );
}
