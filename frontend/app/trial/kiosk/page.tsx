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

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xl font-bold text-slate-800 mb-2">Subject Code</label>
            <input 
              type="text" 
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full text-2xl px-6 py-4 rounded-2xl border-2 border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-200 outline-none uppercase"
              required 
            />
          </div>
          <div>
            <label className="block text-xl font-bold text-slate-800 mb-2">4-Digit PIN</label>
            <input 
              type="password" 
              maxLength={4}
              pattern="\d{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-4xl tracking-[1em] text-center px-6 py-4 rounded-2xl border-2 border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-200 outline-none"
              required 
            />
          </div>
          <button 
            type="submit"
            className="w-full mt-4 bg-sky-600 text-white text-2xl font-black py-5 rounded-2xl hover:bg-sky-700 active:scale-95 transition-transform shadow-md"
          >
            Start
          </button>
        </form>
      </div>
    </div>
  );
}
