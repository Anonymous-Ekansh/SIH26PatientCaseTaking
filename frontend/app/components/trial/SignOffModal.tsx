"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { Shield, X, Key, AlertTriangle } from "lucide-react";

interface SignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (meaning: string) => Promise<void>;
  title: string;
  table: string;
  recordId?: string; // If known
}

export default function SignOffModal({ isOpen, onClose, onSign, title, table, recordId }: SignOffModalProps) {
  const [password, setPassword] = useState("");
  const [meaning, setMeaning] = useState("authored");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || "");
    });
  }, []);

  if (!isOpen) return null;

  const handleSign = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Re-authenticate
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) throw new Error("Invalid password.");

      // 2. Call parent to do the actual data commit first (if needed)
      await onSign(meaning);
      
      // The parent is expected to insert into ct_esignatures, or we can do it here if recordId is provided.
      // But parent might generate the recordId. So parent should handle the esig insert using the meaning provided.
      
      setPassword("");
      onClose();
    } catch (e: any) {
      setError(e.message || "E-signature failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-emerald-400"/> E-Signature Required</h2>
            <p className="text-slate-400 text-xs mt-1">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-3 text-xs font-medium">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>GCP-style controls (prototype), not legal e-sign under FDA 21 CFR Part 11 or IT Act.</p>
          </div>

          {error && <div className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{error}</div>}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Account</label>
            <input type="text" disabled value={email} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-slate-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="w-full pl-9 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Re-enter password to sign..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Meaning of Signature</label>
            <select value={meaning} onChange={e=>setMeaning(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="authored">Authored</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="verified">Verified</option>
            </select>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSign}
              disabled={loading || !password} 
              className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Signing..." : <><Shield size={18}/> Sign & Complete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
