"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LanguageToggle from "@/app/components/trial/LanguageToggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function KioskLogin() {
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDemoStart = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ct/kiosk/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_code: "SYN-1", pin: "1234" })
      });
      if (!res.ok) {
        throw new Error("Backend not reachable – navigating to kiosk menu in demo mode.");
      }
      const data = await res.json();
      localStorage.setItem("kiosk_token", data.token);
      router.push("/trial/kiosk/menu");
    } catch (e: any) {
      // If backend is unavailable, set a demo token and proceed anyway
      localStorage.setItem("kiosk_token", "demo_token_syn1");
      localStorage.setItem("kiosk_demo_mode", "true");
      router.push("/trial/kiosk/menu");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 items-center justify-center font-sans">
      <Link href="/" className="absolute top-8 left-8 text-slate-500 font-bold flex items-center gap-2 hover:text-slate-900">
        <ArrowLeft size={24} /> Back
      </Link>
      <div className="absolute top-6 right-8">
        <LanguageToggle />
      </div>
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-slate-200 max-w-xl w-full">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 text-center">TrialSaathi Kiosk</h1>
        
        <div className="bg-slate-50 border border-slate-200 text-slate-700 text-sm p-6 rounded-xl mb-6 text-center">
          <p className="font-bold text-lg mb-2">Subject Authentication Placeholder</p>
          <p className="text-slate-600 mb-6">
            In production, staff will enter the Subject Code and a secure PIN to unlock the kiosk.
            For this prototype demo, click the button below to instantly load a sample participant session.
          </p>
          <button 
            onClick={handleDemoStart}
            className="w-full bg-amber-500 text-white text-xl font-black py-4 rounded-xl hover:bg-amber-600 active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
          >
            Start Demo Session (SYN-1)
          </button>
        </div>

        {error && <div className="p-4 bg-red-100 text-red-700 text-lg font-bold rounded-xl text-center">{error}</div>}
      </div>
    </div>
  );
}
