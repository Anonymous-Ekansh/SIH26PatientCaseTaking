"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Lock, EyeOff, Server } from "lucide-react";
import { useLanguage } from "@/app/lib/language-context";

export default function PrivacyKiosk() {
  const router = useRouter();
  const { language } = useLanguage();

  const contentEn = {
    title: "Privacy Notice",
    subtitle: "DPDP-aligned Design Prototype",
    points: [
      {
        icon: <Server size={32} className="text-sky-500" />,
        title: "What we collect",
        desc: "We collect your medical history, form answers, and trial adherence data."
      },
      {
        icon: <EyeOff size={32} className="text-purple-500" />,
        title: "Who sees it",
        desc: "Only authorized trial staff (PI, Coordinators). Your identity is masked with a unique Subject Code."
      },
      {
        icon: <Lock size={32} className="text-emerald-500" />,
        title: "How it is protected",
        desc: "All data is securely encrypted at rest. The Audit Log tracks every read and write to your data."
      },
      {
        icon: <Shield size={32} className="text-amber-500" />,
        title: "Right to Withdraw",
        desc: "You can completely withdraw from the trial at any time from the Main Menu, revoking consent instantly."
      }
    ]
  };

  const contentHi = {
    title: "गोपनीयता सूचना",
    subtitle: "DPDP-अनुरूप डिज़ाइन प्रोटोटाइप",
    points: [
      {
        icon: <Server size={32} className="text-sky-500" />,
        title: "हम क्या जानकारी लेते हैं",
        desc: "हम आपका चिकित्सा इतिहास, फॉर्म के उत्तर और परीक्षण डेटा एकत्र करते हैं।"
      },
      {
        icon: <EyeOff size={32} className="text-purple-500" />,
        title: "इसे कौन देखता है",
        desc: "केवल अधिकृत परीक्षण कर्मचारी। आपकी पहचान एक विषय कोड के साथ छिपी रहती है।"
      },
      {
        icon: <Lock size={32} className="text-emerald-500" />,
        title: "यह कैसे सुरक्षित है",
        desc: "सभी डेटा सुरक्षित रूप से एन्क्रिप्टेड है। हर पहुंच को ट्रैक किया जाता है।"
      },
      {
        icon: <Shield size={32} className="text-amber-500" />,
        title: "वापस लेने का अधिकार",
        desc: "आप मुख्य मेनू से किसी भी समय सहमति वापस ले सकते हैं।"
      }
    ]
  };

  const content = language === 'hi' ? contentHi : contentEn;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 items-center">
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <button onClick={() => router.push("/trial/kiosk/menu")} className="text-slate-500 p-4 border border-slate-300 rounded-full hover:bg-slate-200">
          <ArrowLeft size={32} />
        </button>
        <div className="flex flex-col items-end">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{content.title}</h1>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 mt-1">
            {content.subtitle}
          </span>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-sky-100 p-4 rounded-xl border border-sky-200 mb-8">
        <p className="text-sky-800 text-base font-medium">
          <strong>What is this?</strong> This page clearly explains to participants how their sensitive data is handled in compliance with privacy laws (DPDP Act). It guarantees their rights, including the immediate right to withdraw consent digitally.
        </p>
      </div>

      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 flex-1">
        {content.points.map((p, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start justify-center">
            <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {p.icon}
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">{p.title}</h2>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
