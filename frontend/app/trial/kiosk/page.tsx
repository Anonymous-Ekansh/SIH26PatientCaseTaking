"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LanguageToggle from "@/app/components/trial/LanguageToggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function KioskLogin() {
  const [subjectCode, setSubjectCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/ct/kiosk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_code: subjectCode, pin })
      });
      if (!res.ok) {
        throw new Error("Invalid credentials or Subject Code");
      }
      const data = await res.json();
      localStorage.setItem("kiosk_token", data.token);
      router.push("/trial/kiosk/menu");
    } catch (e: any) {
      setError(e.message);
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
        <p className="text-lg text-slate-600 mb-8 text-center font-medium">Please enter your Subject Code and PIN to continue.</p>
        
        {error && <div className="p-4 mb-6 bg-red-100 text-red-700 text-lg font-bold rounded-xl text-center">{error}</div>}

        <div className="bg-slate-50 border border-slate-200 text-slate-700 text-sm p-4 rounded-xl mb-6 text-center">
          <p className="font-bold text-lg mb-1">Subject Authentication Placeholder</p>
          <p className="text-slate-600 mb-4">
            In production, staff will enter the Subject Code and a secure PIN to unlock the kiosk.
            For this prototype demo, click the button below to instantly load a sample participant session.
          </p>
          <button 
            onClick={(e) => {
              setSubjectCode("SYN-1");
              setPin("1234");
              // use timeout to ensure state update before submit
              setTimeout(() => handleLogin(e), 50);
            }}
            className="w-full bg-amber-500 text-white text-xl font-black py-4 rounded-xl hover:bg-amber-600 active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
          >
            Start Demo Session (SYN-1)
          </button>
        </div>

      </div>
    </div>
  );
}
