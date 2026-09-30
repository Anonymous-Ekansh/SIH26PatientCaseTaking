"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function TrialLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const demoRoles = ["pi", "coordinator", "monitor", "ethics_committee", "pharmacovigilance", "admin", "regulator_ro", "leadership"];
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "SyntheticDemo123!";

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });

    if (authError || !authData.user) {
      setError(authError?.message || "Login failed");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("ct_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .single();

    if (!profile) {
      await supabase.auth.signOut();
      setError("No trial access for this account");
      setLoading(false);
      return;
    }

    router.push("/trial");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-left">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Staff Sign-In</h1>
        <p className="text-sm text-slate-600 mb-6">Enter your credentials to access the clinical trial dashboard.</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
            {error === "No trial access for this account" && (
              <div className="mt-2 text-xs text-red-500">
                Regular patient accounts cannot access TrialSaathi.
              </div>
            )}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              required 
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white font-bold py-2.5 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-sky-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>

      {isDemoMode && (
        <div className="mt-8 bg-amber-50 p-6 rounded-xl border border-amber-200 max-w-3xl w-full">
          <h3 className="font-bold text-amber-800 mb-4 text-center">Demo Mode: Instant Login</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {demoRoles.map(role => (
              <button
                key={role}
                onClick={() => handleLogin(`demo_${role}@synthetic.local`, demoPassword)}
                disabled={loading}
                className="px-4 py-2 bg-white border border-amber-300 text-amber-700 text-sm font-bold rounded-full hover:bg-amber-100 transition-colors"
              >
                Log in as {role.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
