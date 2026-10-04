"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { ShieldAlert, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function SafetyDesk() {
  const { userId } = useRole();
  const [aes, setAes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSafety = async () => {
    try {
      const { data } = await supabase
        .from('ct_adverse_events')
        .select(`
          *,
          ct_participants (subject_code)
        `)
        .order('aware_at', { ascending: false });
      
      if (data) setAes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafety();
  }, []);

  const handleConfirm = async (id: string) => {
    if (!userId) return;
    try {
      await supabase.from('ct_adverse_events').update({
        status: 'open'
      }).eq('id', id);
      fetchSafety();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: string) => {
    if (!userId) return;
    try {
      await supabase.from('ct_adverse_events').update({
        status: 'resolved'
      }).eq('id', id);
      fetchSafety();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <RoleGate allow={['pi', 'coordinator', 'pharmacovigilance', 'ethics_committee', 'regulator_ro', 'admin']}>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={28} className="text-red-500" /> Safety Desk
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor, confirm, and resolve Adverse Events (AEs).</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading safety data...</div>
        ) : (
          <div className="space-y-4">
            {aes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 font-medium shadow-sm">
                No adverse events recorded.
              </div>
            ) : (
              aes.map(ae => (
                <div key={ae.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className={`w-2 md:w-3 ${ae.status === 'candidate' ? 'bg-amber-400' : ae.status === 'open' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${ae.status === 'candidate' ? 'bg-amber-50 text-amber-700 border-amber-200' : ae.status === 'open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {ae.status}
                        </span>
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Subject: {ae.ct_participants?.subject_code}</span>
                      </div>
                      <div className="text-sm text-slate-400 font-medium">
                        Aware At: {new Date(ae.aware_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <h3 className="font-black text-slate-900 text-lg mb-2">{ae.verbatim_term}</h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="font-bold">Source:</span> {ae.source}
                      </div>
                      {ae.serious && (
                        <div className="flex items-center gap-1 text-red-600 font-bold">
                          <AlertTriangle size={16} /> SERIOUS
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 px-6 py-4 md:border-l border-t md:border-t-0 border-slate-200 flex md:flex-col justify-center items-center gap-3">
                    {ae.status === 'candidate' && (
                      <button onClick={() => handleConfirm(ae.id)} className="w-full px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm">
                        Confirm as AE
                      </button>
                    )}
                    {ae.status === 'open' && (
                      <button onClick={() => handleResolve(ae.id)} className="w-full px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm">
                        Resolve AE
                      </button>
                    )}
                    {ae.status === 'resolved' && (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle size={20} /> Resolved
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
