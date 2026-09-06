"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/lib/language-context";
import { useTranslations } from "next-intl";

/* ── Progress Dots ── */
function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i <= current
              ? "bg-[#0EA5E9]"
              : "bg-white border-2 border-[#E5E7EB]"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingLanguage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const t = useTranslations("Onboarding");

  const pick = (lang: "en" | "hi") => {
    setLanguage(lang);
    setTimeout(() => {
      // Small reload to force locale cookie to take effect on the server
      window.location.href = "/onboarding/signin";
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-4 border-b border-[#E5E7EB]">
        <span className="font-bold text-lg tracking-tight text-[#1A1A1A]">
          Medi<span className="text-[#0EA5E9]">Kiosk</span>
        </span>
      </div>

      <ProgressDots current={0} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">{t('title')}</h1>
          <p className="text-[#6B7280] text-sm mb-8">
            {t('subtitle')}
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => pick("en")}
              className={`w-full py-6 rounded-2xl border-2 transition-all text-center active:scale-[0.97] ${
                language === "en"
                  ? "border-[#0EA5E9] bg-sky-50"
                  : "border-[#E5E7EB] bg-white hover:border-sky-200"
              }`}
            >
              <span className="text-2xl font-bold block text-[#1A1A1A]">{t('english')}</span>
              <span className="text-[#6B7280] text-sm">{t('english_sub')}</span>
            </button>
            <button
              onClick={() => pick("hi")}
              className={`w-full py-6 rounded-2xl border-2 transition-all text-center active:scale-[0.97] ${
                language === "hi"
                  ? "border-[#0EA5E9] bg-sky-50"
                  : "border-[#E5E7EB] bg-white hover:border-sky-200"
              }`}
            >
              <span className="text-2xl font-bold block text-[#1A1A1A]">{t('hindi')}</span>
              <span className="text-[#6B7280] text-sm">{t('hindi_sub')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
