"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function TrialLogin() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  
  const demoRoles = ["pi", "coordinator", "monitor", "ethics_committee", "pharmacovigilance", "admin", "regulator_ro", "leadership"];
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "SyntheticDemo123!";

  const handleLogin = async (loginRole: string) => {
    setLoading(true);
    setError("");
    
    // Completely bypass Supabase auth for demo mode
    localStorage.setItem('demo_role', loginRole);
    router.push("/trial/home");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-left">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Staff Sign-In</h1>
        <p className="text-sm text-slate-600 mb-6">Access the clinical trial dashboard by selecting a demo role below.</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-sky-100 border border-sky-200 text-sky-800 p-4 rounded-lg mb-4 text-center">
          <p className="font-semibold mb-1 text-sm">What is this?</p>
          <p className="text-xs">
            In production, trial staff authenticate via Enterprise SSO. For this hackathon demo, you can completely bypass login by selecting a role below. <strong>Try switching roles to see how the platform implements Role-Based Access Control (RBAC).</strong>
          </p>
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-sky-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-amber-50 p-6 rounded-xl border border-amber-200 max-w-3xl w-full">
        <h3 className="font-bold text-amber-800 mb-4 text-center">Select Demo Role</h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {demoRoles.map(role => (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              disabled={loading}
              className="px-4 py-2 bg-white border border-amber-300 text-amber-700 text-sm font-bold rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Log in as {role.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
