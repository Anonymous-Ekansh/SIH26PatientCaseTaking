import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  UserCheck,
  MessageSquare,
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  Leaf,
  Calendar,
} from "lucide-react";
import LanguageToggle from "./components/LanguageToggle";

export default function Home() {
  const t = useTranslations("Landing");

  const STEPS = [
    { icon: UserCheck, title: t('step1_title'), desc: t('step1_desc') },
    { icon: MessageSquare, title: t('step2_title'), desc: t('step2_desc') },
    { icon: UploadCloud, title: t('step3_title'), desc: t('step3_desc') },
    { icon: FileText, title: t('step4_title'), desc: t('step4_desc') },
    { icon: CheckCircle2, title: t('step5_title'), desc: t('step5_desc') },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight">
            Trial<span className="text-[#0EA5E9]">Saathi</span> <span className="text-xs text-gray-500 font-normal ml-2 hidden sm:inline">includes MediKiosk intake</span>
          </span>
          <LanguageToggle />
        </div>
      </header>

      <main>
        {/* ── TrialSaathi Hero ── */}
        <section className="bg-sky-50 py-16 md:py-24 border-b border-[#E5E7EB]">
          <div className="max-w-[1100px] mx-auto px-5 text-center flex flex-col items-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mb-8 text-[#1A1A1A]">
              {t('trialsaathi_headline')}
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/trial"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0EA5E9] text-white font-semibold rounded-full hover:bg-sky-600 transition-colors active:scale-[0.97] w-full sm:w-auto"
              >
                {t('btn_staff_signin')}
              </Link>

              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-slate-800 text-white font-semibold rounded-full hover:bg-slate-700 transition-colors active:scale-[0.97] w-full sm:w-auto"
              >
                {t('btn_intake')}
              </Link>
              
              <Link
                href="/trial/kiosk"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-colors active:scale-[0.97] w-full sm:w-auto"
              >
                Participant Kiosk
              </Link>
            </div>
            <p className="mt-6 text-sm text-sky-800 max-w-2xl bg-sky-100 p-3 rounded-lg border border-sky-200">
              <strong>What is the Participant Kiosk?</strong> It is a secure, dedicated portal for enrolled clinical trial subjects to submit Electronic Informed Consent (eConsent) and protocol-specific daily health diaries (ePRO) directly to the trial dashboard.
            </p>
          </div>
        </section>

        {/* ── Existing Hero ── */}
        <section className="max-w-[1100px] mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-24 text-center flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mb-5 text-[#1A1A1A]">
            {t('hero_title')}
          </h1>
          <p className="text-base md:text-lg text-[#6B7280] max-w-xl mb-8 leading-relaxed">
            {t('hero_subtitle')}
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0EA5E9] text-white font-semibold rounded-full hover:bg-sky-600 transition-colors active:scale-[0.97]"
          >
            {t('get_started')} <ArrowRight size={18} />
          </Link>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#F5F5F5] py-16 md:py-20">
          <div className="max-w-[1100px] mx-auto px-5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-14 text-[#1A1A1A]">
              {t('how_it_works')}
            </h2>

            <div className="flex flex-col md:flex-row relative gap-10 md:gap-0">
              {/* Desktop connector line */}
              <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-[#E5E7EB]" />
              {/* Mobile connector line */}
              <div className="block md:hidden absolute left-[27px] top-7 bottom-7 w-px bg-[#E5E7EB]" />

              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex md:flex-col items-start md:items-center relative z-10 gap-5 md:gap-3 flex-1"
                >
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-[#E5E7EB] flex items-center justify-center text-[#0EA5E9] flex-shrink-0">
                    <step.icon size={22} />
                  </div>
                  <div className="md:text-center pt-1 md:pt-0">
                    <p className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wider mb-0.5">
                      {t('step')} {i + 1}
                    </p>
                    <h3 className="font-semibold text-[#1A1A1A] mb-1">{step.title}</h3>
                    <p className="text-[#6B7280] text-sm md:max-w-[180px]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Showcase / Features ── */}
        <section className="py-20 md:py-28 max-w-[1100px] mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-[#1A1A1A] mb-4">
              {t('showcase_title')}
            </h2>
          </div>

          <div className="flex flex-col gap-12 md:gap-24">
            {/* Feature 1: Conversation */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 max-w-sm mx-auto transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400">CURRENT QUESTION</div>
                      <div className="font-semibold text-gray-800 text-sm">Can you describe the pain?</div>
                    </div>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 self-end">
                    <p className="text-sm text-sky-900">It feels like a sharp tightness in my chest.</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-2 w-24 bg-gray-100 rounded-full"></div>
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('showcase_conv_title')}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{t('showcase_conv_desc')}</p>
              </div>
            </div>

            {/* Feature 2: Document Digitization */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-emerald-50 p-6 md:p-8 rounded-3xl border border-emerald-200 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex flex-col gap-3 max-w-sm mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><UploadCloud size={14}/> Blood_Report_2026.pdf</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Processed</span>
                  </div>
                  <div className="space-y-3">
                    <div className="border border-gray-100 rounded p-2">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Diagnoses Found</div>
                      <div className="text-sm font-medium text-gray-800">Type 2 Diabetes Mellitus</div>
                    </div>
                    <div className="border border-gray-100 rounded p-2">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Abnormal Labs</div>
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-red-600">HbA1c</span>
                        <span className="text-red-600 font-bold">7.8% (High)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <UploadCloud size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('showcase_doc_title')}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{t('showcase_doc_desc')}</p>
              </div>
            </div>

            {/* Feature 3: Clinical Summary */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-indigo-50 p-6 md:p-8 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 max-w-sm mx-auto transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="border-b border-gray-100 pb-3 mb-3">
                    <h4 className="font-bold text-gray-900 text-lg">Case Summary</h4>
                    <p className="text-xs text-gray-500">Dr. Sharma • Oct 24, 2026</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Chief Complaint</div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">Chest Pain & Shortness of Breath</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">HPI</div>
                      <p className="text-xs text-gray-600 leading-relaxed mt-0.5">Patient reports sharp tightness in the chest radiating to the left arm for the past 2 hours. Exacerbated by exertion.</p>
                    </div>
                    <div className="bg-red-50 text-red-700 p-2 rounded border border-red-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span className="text-xs font-bold">Priority Triage Flagged</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                  <FileText size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('showcase_sum_title')}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{t('showcase_sum_desc')}</p>
              </div>
            </div>

            {/* Feature 4: AYUSH Assessment */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-orange-50 p-6 md:p-8 rounded-3xl border border-orange-200 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 flex flex-col gap-4 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="flex justify-between items-center border-b border-orange-50 pb-2">
                    <span className="font-bold text-gray-800">Dosha Analysis</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Vata Dominant</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-500">
                        <span>Vata</span> <span>60%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 w-[60%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-500">
                        <span>Pitta</span> <span>30%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 w-[30%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-500">
                        <span>Kapha</span> <span>10%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-300 w-[10%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                  <Leaf size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('showcase_ayush_title')}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{t('showcase_ayush_desc')}</p>
              </div>
            </div>

            {/* Feature 5: Seamless Booking */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-teal-50 p-6 md:p-8 rounded-3xl border border-teal-200 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-teal-100 p-5 max-w-sm mx-auto transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                      DR
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Dr. Rakesh Kumar</h4>
                      <p className="text-xs text-gray-500">Cardiology</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
                    <div className="text-xs text-gray-500 font-bold mb-1 uppercase">Appointment</div>
                    <div className="text-sm font-semibold text-gray-800 flex items-center justify-between">
                      <span>Today, 10:30 AM</span>
                      <CheckCircle2 size={16} className="text-teal-500" />
                    </div>
                  </div>
                  <button className="w-full bg-teal-600 text-white text-sm font-bold py-2 rounded-lg opacity-90 cursor-default">
                    Linked to EHR
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6">
                  <Calendar size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('showcase_book_title')}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{t('showcase_book_desc')}</p>
              </div>
            </div>

            {/* Feature 6: TrialSaathi Workspaces */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-sm relative overflow-hidden">
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 p-5 flex flex-col gap-3 max-w-sm mx-auto transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span className="font-bold text-slate-200">Role Workspaces</span>
                    <span className="text-xs bg-sky-900 text-sky-300 px-2 py-0.5 rounded font-bold">CTMS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">PI / Coordinator</div>
                      <div className="text-xs font-semibold text-slate-200">Portfolio & Verify</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pharmacovigilance</div>
                      <div className="text-xs font-semibold text-slate-200">Safety Desk</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ethics Comm.</div>
                      <div className="text-xs font-semibold text-slate-200">Regulatory</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Data Monitor</div>
                      <div className="text-xs font-semibold text-slate-200">Query Aging</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-6">
                  <UserCheck size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Role-Based CTMS Workspaces</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  TrialSaathi provides highly isolated, role-specific dashboards. Principal Investigators, Data Monitors, and Pharmacovigilance teams only see the data, queries, and action items explicitly assigned to their roles.
                </p>
              </div>
            </div>

            {/* Feature 7: Cryptographic Audit & Compliance */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex-1 w-full bg-rose-50 p-6 md:p-8 rounded-3xl border border-rose-200 shadow-sm relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5 flex flex-col gap-4 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="border-b border-rose-50 pb-2 flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">Audit Ledger</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-1 rounded font-bold uppercase flex items-center gap-1"><CheckCircle2 size={10}/> Intact</span>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600 font-mono break-all">
                      ...f3a9e01b -&gt; row_hash(old, new)
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600 font-mono break-all">
                      ...a7b2c93f -&gt; row_hash(old, new)
                    </div>
                    <div className="bg-rose-100 text-rose-700 p-2 rounded border border-rose-200 text-xs font-bold text-center mt-2 flex items-center justify-center gap-2">
                      <FileText size={14}/> GCP-Aligned E-Signature
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Cryptographic Audit & E-Signatures</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Every data mutation is cryptographically hashed to the preceding row (blockchain-style). Tampering is mathematically impossible without breaking the chain. Combined with GCP-aligned E-Signatures via secure re-authentication.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E7EB] py-8">
        <div className="max-w-[1100px] mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="font-bold text-lg tracking-tight">
            Trial<span className="text-[#0EA5E9]">Saathi</span>
          </span>
          <p className="text-xs text-[#6B7280] text-center md:text-right max-w-lg">
            {t('footer_text')}
          </p>
        </div>
      </footer>
    </div>
  );
}
