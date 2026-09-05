import Link from "next/link";
import {
  UserCheck,
  MessageSquare,
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import LanguageToggle from "./components/LanguageToggle";

const STEPS = [
  { icon: UserCheck, title: "Identify", desc: "Sign in and give consent." },
  { icon: MessageSquare, title: "Converse", desc: "Answer questions by voice or touch." },
  { icon: UploadCloud, title: "Scan", desc: "Upload your old prescriptions and reports." },
  { icon: FileText, title: "Summarize", desc: "AI builds a structured history." },
  { icon: CheckCircle2, title: "Consult", desc: "Your doctor sees everything instantly." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight">
            Medi<span className="text-[#0EA5E9]">Kiosk</span>
          </span>
          <LanguageToggle />
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="max-w-[1100px] mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-24 text-center flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mb-5 text-[#1A1A1A]">
            Your medical history, ready before you walk in.
          </h1>
          <p className="text-base md:text-lg text-[#6B7280] max-w-xl mb-8 leading-relaxed">
            MediKiosk listens, scans, and prepares a complete patient history
            for your doctor, in the language you speak, before your consultation
            even starts.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0EA5E9] text-white font-semibold rounded-full hover:bg-sky-600 transition-colors active:scale-[0.97]"
          >
            Get started <ArrowRight size={18} />
          </Link>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#F5F5F5] py-16 md:py-20">
          <div className="max-w-[1100px] mx-auto px-5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-14 text-[#1A1A1A]">
              How MediKiosk works
            </h2>

            <div className="flex flex-col md:flex-row relative gap-10 md:gap-0">
              {/* Desktop connector line */}
              <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-[#E5E7EB]" />
              {/* Mobile connector line */}
              <div className="block md:hidden absolute left-[27px] top-7 bottom-7 w-px bg-[#E5E7EB]" />

              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="flex md:flex-col items-start md:items-center relative z-10 gap-5 md:gap-3 flex-1"
                >
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-[#E5E7EB] flex items-center justify-center text-[#0EA5E9] flex-shrink-0">
                    <step.icon size={22} />
                  </div>
                  <div className="md:text-center pt-1 md:pt-0">
                    <p className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wider mb-0.5">
                      Step {i + 1}
                    </p>
                    <h3 className="font-semibold text-[#1A1A1A] mb-1">{step.title}</h3>
                    <p className="text-[#6B7280] text-sm md:max-w-[180px]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E7EB] py-8">
        <div className="max-w-[1100px] mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="font-bold text-lg tracking-tight">
            Medi<span className="text-[#0EA5E9]">Kiosk</span>
          </span>
          <p className="text-xs text-[#6B7280] text-center md:text-right">
            Built for Smart India Hackathon, Problem Statement SIH26047,
            Ministry of Ayush
          </p>
        </div>
      </footer>
    </div>
  );
}
