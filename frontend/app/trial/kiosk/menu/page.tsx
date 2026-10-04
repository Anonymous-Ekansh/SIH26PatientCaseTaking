"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, FileText, Stethoscope, AlertTriangle, Shield } from "lucide-react";

export default function KioskMenu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kiosk_token");
    if (!token) {
      router.push("/trial/kiosk");
      return;
    }
    fetch("http://localhost:8000/api/ct/kiosk/me", {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => {
      setUser(data);
      setLoading(false);
    })
    .catch(() => router.push("/trial/kiosk"));
  }, [router]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 items-center font-sans">
      <div className="w-full max-w-5xl flex justify-between items-center mb-12 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900">Subject: <span className="text-sky-600 uppercase">{user.subject_code}</span></h1>
        <button onClick={() => { localStorage.removeItem("kiosk_token"); router.push("/trial/kiosk"); }} className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors">
          <LogOut size={24} /> Log Out
        </button>
      </div>

      <div className="w-full max-w-5xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <button 
          onClick={() => router.push("/trial/kiosk/screening")} 
          disabled={user.status === 'withdrawn'}
          className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm hover:border-sky-500 hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
        >
          <Stethoscope size={48} className="text-sky-500 mb-6 group-hover:scale-110 transition-transform" />
          <h2 className="text-3xl font-black text-slate-900 mb-2">Screening</h2>
          <p className="text-lg text-slate-500">Answer medical questions for eligibility.</p>
        </button>

        <button 
          onClick={() => router.push("/trial/kiosk/visit")} 
          disabled={user.status === 'withdrawn'}
          className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
        >
          <Stethoscope size={48} className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
          <h2 className="text-3xl font-black text-slate-900 mb-2">Visit Tasks</h2>
          <p className="text-lg text-slate-500">Complete your next scheduled visit questionnaire.</p>
        </button>
        
        <button 
          onClick={() => router.push("/trial/kiosk/consent")} 
          disabled={user.status === 'withdrawn'}
          className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
        >
          <FileText size={48} className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
          <h2 className="text-3xl font-black text-slate-900 mb-2">E-Consent</h2>
          <p className="text-lg text-slate-500">Review and sign trial consent documents.</p>
        </button>
        
        <button onClick={() => router.push("/trial/kiosk/privacy")} className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm hover:border-purple-500 hover:shadow-md transition-all text-left group">
          <Shield size={48} className="text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
          <h2 className="text-3xl font-black text-slate-900 mb-2">Privacy Notice</h2>
          <p className="text-lg text-slate-500">How we protect your data (DPDP-aligned).</p>
        </button>

        {user.status !== 'withdrawn' ? (
          <button 
            onClick={async () => {
              if(confirm("Are you sure you want to withdraw from the trial? You will not be able to fill forms anymore.")) {
                await fetch("http://localhost:8000/api/ct/kiosk/withdraw", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${localStorage.getItem("kiosk_token")}` }
                });
                alert("You have been successfully withdrawn.");
                window.location.reload();
              }
            }} 
            className="bg-red-50 p-8 rounded-3xl border-2 border-red-200 shadow-sm hover:border-red-500 hover:bg-red-100 transition-all text-left group md:col-span-2 lg:col-span-3"
          >
            <AlertTriangle size={48} className="text-red-500 mb-6 group-hover:scale-110 transition-transform" />
            <h2 className="text-3xl font-black text-red-700 mb-2">Withdraw Consent</h2>
            <p className="text-lg text-red-600">Withdraw your consent from this trial. You will no longer be able to submit forms.</p>
          </button>
        ) : (
          <div className="bg-slate-800 p-8 rounded-3xl border-2 border-slate-900 text-left md:col-span-2 lg:col-span-3">
            <h2 className="text-3xl font-black text-white mb-2">Withdrawn</h2>
            <p className="text-lg text-slate-400">You have withdrawn your consent from this trial on {new Date(user.withdrawn_at).toLocaleString()}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
