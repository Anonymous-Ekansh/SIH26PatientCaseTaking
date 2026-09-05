"use client";

import { useLanguage } from "@/app/lib/language-context";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-[#F5F5F5] rounded-full p-1 border border-[#E5E7EB]">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
          language === "en"
            ? "bg-[#0EA5E9] text-white"
            : "text-[#6B7280] hover:text-[#1A1A1A]"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("hi")}
        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
          language === "hi"
            ? "bg-[#0EA5E9] text-white"
            : "text-[#6B7280] hover:text-[#1A1A1A]"
        }`}
      >
        हि
      </button>
    </div>
  );
}
