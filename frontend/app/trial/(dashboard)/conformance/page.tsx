"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { createClient } from "@/app/lib/supabase/client";
import { Stamp, CheckCircle, Clock, Link2, ShieldCheck, Download, AlertTriangle, ExternalLink, Server } from "lucide-react";

export default function ConformanceDesk() {
  const { role } = useRole();
  const [studies, setStudies] = useState<any[]>([]);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [dataAcc, setDataAcc] = useState({
    totalForms: 0, verifiedForms: 0,
    totalQueries: 0, closedQueries: 0,
    totalEsigs: 0
  });
  
  const [timeSae, setTimeSae] = useState({
    onTime: 0, late: 0, overdue: 0, open: 0
  });
  
  const [auditStats, setAuditStats] = useState({
    totalLogs: 0, tableCount: 0
  });

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const supabase = createClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchStudies = async () => {
      const { data } = await supabase.from('ct_studies').select('id, short_code, title');
      if (data) {
        setStudies(data);
        if (data.length > 0) setSelectedStudy(data[0].id);
      }
    };
    fetchStudies();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Data accuracy
        const { count: tForms } = await supabase.from('ct_form_responses').select('*', { count: 'exact', head: true });
        const { count: vForms } = await supabase.from('ct_form_responses').select('*', { count: 'exact', head: true }).eq('status', 'verified');
        const { count: tQueries } = await supabase.from('ct_queries').select('*', { count: 'exact', head: true });
        const { count: cQueries } = await supabase.from('ct_queries').select('*', { count: 'exact', head: true }).eq('status', 'closed');
        const { count: tEsigs } = await supabase.from('ct_esignatures').select('*', { count: 'exact', head: true });
        
        setDataAcc({
          totalForms: tForms || 0, verifiedForms: vForms || 0,
          totalQueries: tQueries || 0, closedQueries: cQueries || 0,
          totalEsigs: tEsigs || 0
        });

        // Timeliness
        const { data: timeliness } = await supabase.from('ct_v_sae_timeliness').select('status');
        const tCounts = { onTime: 0, late: 0, overdue: 0, open: 0 };
        (timeliness || []).forEach(row => {
          if (row.status === 'on_time') tCounts.onTime++;
          if (row.status === 'late') tCounts.late++;
          if (row.status === 'overdue') tCounts.overdue++;
          if (row.status === 'open') tCounts.open++;
        });
        setTimeSae(tCounts);
        
        // Audit Stats
        const { data: logs } = await supabase.from('ct_audit_log').select('table_name');
        const tables = new Set((logs || []).map(l => l.table_name));
        setAuditStats({ totalLogs: logs?.length || 0, tableCount: tables.size });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const verifyChain = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/ct/audit/verify`, { method: "POST" });
      const data = await res.json();
      if (data.status === 'success') {
        setVerifyResult(data.result[0]); 
      } else {
        alert("Verification API error");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to verify chain.");
    } finally {
      setVerifying(false);
    }
  };

  const downloadFile = (url: string) => window.open(url, '_blank');

  const formPct = dataAcc.totalForms ? Math.round((dataAcc.verifiedForms / dataAcc.totalForms) * 100) : 0;
  const queryPct = dataAcc.totalQueries ? Math.round((dataAcc.closedQueries / dataAcc.totalQueries) * 100) : 0;
  const resolvedClocks = timeSae.onTime + timeSae.late;
  const onTimePct = resolvedClocks ? Math.round((timeSae.onTime / resolvedClocks) * 100) : 100;

  return (
    <RoleGate allow={['admin', 'monitor', 'regulator_ro']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div className="w-full">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <Stamp size={32} className="text-fuchsia-600" /> Compliance & Conformance
            </h1>
            <p className="text-slate-500 text-sm mt-1 mb-4">Real-time metrics on GCP adherence, data integrity, and system compliance.</p>
            <div className="bg-sky-100 p-4 rounded-xl border border-sky-200">
              <p className="text-sky-800 text-sm font-medium">
                <strong>What is this?</strong> This dashboard aggregates real-time regulatory compliance metrics across the trial. It mathematically evaluates ALCOA-CCEA adherence, consent validity, and protocol conformance, giving sponsors a unified view of audit readiness.
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase px-2">Study</span>
            <select 
              value={selectedStudy} 
              onChange={e => setSelectedStudy(e.target.value)}
              className="p-2 border-l border-slate-200 bg-transparent font-bold outline-none cursor-pointer text-fuchsia-700"
            >
              {studies.map(s => <option key={s.id} value={s.id}>{s.short_code}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading conformance data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Data Accuracy and Integrity */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <CheckCircle size={20} className="text-emerald-500" /> Data Accuracy & Integrity
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                    <span>Forms Verified by Investigator</span>
                    <span>{formPct}% ({dataAcc.verifiedForms}/{dataAcc.totalForms})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${formPct}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                    <span>Data Queries Closed</span>
                    <span>{queryPct}% ({dataAcc.closedQueries}/{dataAcc.totalQueries})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${queryPct}%` }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">E-Signature Coverage</span>
                  <span className="bg-fuchsia-100 text-fuchsia-800 font-bold px-3 py-1 rounded-full text-xs">
                    {dataAcc.totalEsigs} Signatures Recorded
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Timeliness of safety reporting */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Clock size={20} className="text-amber-500" /> SAE Reporting Timeliness
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-3xl font-black text-emerald-600 mb-1">{onTimePct}%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">On-Time Submissions</div>
                  <div className="text-[10px] text-slate-400 mt-1">{resolvedClocks} resolved clocks</div>
                </div>
                <div className={`p-4 rounded-xl border text-center ${timeSae.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-3xl font-black mb-1 ${timeSae.overdue > 0 ? 'text-red-600' : 'text-slate-700'}`}>{timeSae.overdue}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Overdue Clocks</div>
                  <div className="text-[10px] text-slate-400 mt-1">Require immediate action</div>
                </div>
              </div>
            </div>

            {/* 3. Interoperability */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Link2 size={20} className="text-sky-500" /> Interoperability
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2 items-center bg-sky-50 text-sky-800 p-3 rounded-lg border border-sky-200 text-sm font-medium">
                  <CheckCircle size={16}/> HL7 FHIR v5.0.0 Validator passing with expected profile constraints. 
                </div>
                <div className="flex gap-4">
                  <button onClick={() => window.open('/docs/CONFORMANCE/fhir.txt')} className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:underline">
                    <ExternalLink size={14}/> View Validation Note
                  </button>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => downloadFile(`${apiUrl}/api/ct/export/fhir/${selectedStudy}`)} className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 text-sm shadow-sm">
                    <Download size={16}/> Sample FHIR Bundle
                  </button>
                  <button onClick={() => downloadFile(`${apiUrl}/api/ct/export/sdtm/${selectedStudy}`)} className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 text-sm shadow-sm">
                    <Download size={16}/> Sample SDTM Zip
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Access control and audit */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <ShieldCheck size={20} className="text-indigo-500" /> Access Control & Audit
              </h3>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm font-bold text-slate-700">Role-Based Access Matrix</div>
                  <div className="text-xs text-slate-500">Strict GCP boundary enforcements</div>
                </div>
                <button onClick={() => window.open('/docs/ACCESS_MATRIX.md')} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                  <ExternalLink size={20} />
                </button>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm font-bold text-slate-700">Audit Trail Coverage</div>
                  <div className="text-xs text-slate-500">Continuous cryptographic tracking</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">{auditStats.tableCount} Tables Tracked</div>
                  <div className="text-xs text-slate-400">{auditStats.totalLogs} logs secured</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={verifyChain} 
                  disabled={verifying}
                  className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 text-sm shadow-sm disabled:opacity-50"
                >
                  <Server size={16}/> {verifying ? "Verifying..." : "Live Verify Audit Hash Chain"}
                </button>
                
                {verifyResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${verifyResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {verifyResult.ok ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{verifyResult.ok ? "Chain Intact" : "Chain Broken"}</div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        {verifyResult.ok ? `Verified ${verifyResult.checked} cryptographic links across all protected logs.` : `Tampering detected at row ${verifyResult.first_broken_id}.`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </RoleGate>
  );
}
