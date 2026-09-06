"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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

/* ── Google G icon ── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

import { createClient } from "@/app/lib/supabase/client";
import { useTranslations } from "next-intl";

export default function OnboardingSignIn() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("Signin");

  const handleGoogleClick = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-4 border-b border-[#E5E7EB]">
        <span className="font-bold text-lg tracking-tight text-[#1A1A1A]">
          Medi<span className="text-[#0EA5E9]">Kiosk</span>
        </span>
      </div>

      <ProgressDots current={1} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <button
            onClick={() => router.push("/onboarding")}
            className="flex items-center gap-1 text-[#6B7280] text-sm mb-6 hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={16} /> {t('back')}
          </button>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 md:p-8">
            <h1 className="text-xl font-bold text-[#1A1A1A] mb-1 text-center">
              {t('title')}
            </h1>
            <p className="text-[#6B7280] text-sm mb-8 text-center">
              {t('subtitle')}
            </p>

            <button
              onClick={handleGoogleClick}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] transition-colors font-medium text-[#1A1A1A] active:scale-[0.97] min-h-[56px]"
            >
              <GoogleIcon />
              <span>{t('continue_google')}</span>
            </button>

            <div className="mt-6 text-center">
              <span className="text-[#6B7280] text-xs inline-flex items-center gap-1.5">
                {t('abha_text')}
                <span className="text-[10px] bg-[#F5F5F5] text-[#6B7280] px-1.5 py-0.5 rounded-full font-medium border border-[#E5E7EB]">
                  {t('coming_soon')}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
