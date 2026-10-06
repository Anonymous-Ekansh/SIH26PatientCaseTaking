"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { createClient } from "@/app/lib/supabase/client";
import { Download, FileJson, FileSpreadsheet, Lock, ExternalLink, Activity, Users, FileWarning } from "lucide-react";
import Link from "next/link";

export default function ExportsDesk() {
  const { role } = useRole();
  const [studies, setStudies] = useState<any[]>([]);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [dsmbData, setDsmbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // DSMB specific
  const [threshold, setThreshold] = useState(5);
  
  const supabase = createClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const { data } = await supabase.from('ct_studies').select('id, short_code, title');
        if (data) {
          setStudies(data);
          if (data.length > 0) setSelectedStudy(data[0].id);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStudies();
  }, []);

  useEffect(() => {
    if (!selectedStudy) return;
    const fetchDsmb = async () => {
      try {
        const { data } = await supabase.from('ct_adverse_events')
          .select('id, verbatim_term, severity, serious, causality, ct_participants(site_id)')
          .eq('ct_participants.study_id', selectedStudy)
          .not('ct_participants', 'is', null); // Inner join approx
          
        if (data) setDsmbData(data);
      } catch(e) { console.error(e); }
    };
    fetchDsmb();
  }, [selectedStudy]);

  const downloadFile = (url: string) => {
    window.open(url, '_blank');
  };

  // Process DSMB Data for grouping
  const aeGroups = dsmbData.reduce((acc, ae) => {
    const term = ae.verbatim_term || "Unknown";
    if (!acc[term]) acc[term] = { term, count: 0, severe: 0, serious: 0, related: 0 };
    acc[term].count++;
    if (ae.severity === 'severe') acc[term].severe++;
    if (ae.serious) acc[term].serious++;
    if (ae.causality === 'certain' || ae.causality === 'probable') acc[term].related++;
    return acc;
  }, {} as Record<string, any>);
  
  const aeGroupsList = Object.values(aeGroups).sort((a:any, b:any) => b.count - a.count);

  return (
    <RoleGate allow={['pi', 'coordinator', 'admin', 'leadership']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <Download size={32} className="text-sky-600" /> Data Exports & DSMB
            </h1>
            <p className="text-slate-500 text-sm mt-1">Export structured datasets (FHIR, SDTM) and review DSMB summary data.</p>
          </div>
          <div className="flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase px-2">Study</span>
            <select 
              value={selectedStudy} 
              onChange={e => setSelectedStudy(e.target.value)}
              className="p-2 border-l border-slate-200 bg-transparent font-bold outline-none cursor-pointer text-sky-700"
            >
              {studies.map(s => <option key={s.id} value={s.id}>{s.short_code}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading export data...</div>
        ) : (
          <div className="space-y-8">
            
            {/* Download Buttons Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* FHIR Export */}
              <button 
                onClick={() => downloadFile(`${apiUrl}/api/ct/export/fhir/${selectedStudy}`)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md text-left flex flex-col gap-3 transition-all"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit"><FileJson size={24} /></div>
                <div>
                  <div className="font-bold text-slate-800">FHIR R4 Bundle</div>
                  <div className="text-xs text-slate-500 mt-1">JSON format containing Subject, AE, Lab, Consent</div>
                </div>
              </button>

              {/* SDTM-style Export */}
              <button 
                onClick={() => downloadFile(`${apiUrl}/api/ct/export/sdtm/${selectedStudy}`)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md text-left flex flex-col gap-3 transition-all"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg w-fit"><FileSpreadsheet size={24} /></div>
                <div>
                  <div className="font-bold text-slate-800">SDTM-style Export</div>
                  <div className="text-xs text-slate-500 mt-1">ZIP of DM, AE, SV, LB CSV domains</div>
                </div>
              </button>
              
              {/* DSMB CSV Export */}
              <button 
                onClick={() => downloadFile(`${apiUrl}/api/ct/export/dsmb/${selectedStudy}`)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md text-left flex flex-col gap-3 transition-all"
              >
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg w-fit"><Activity size={24} /></div>
                <div>
                  <div className="font-bold text-slate-800">DSMB Report</div>
                  <div className="text-xs text-slate-500 mt-1">AE line-listing in CSV</div>
                </div>
              </button>

              {/* Disabled ADaM */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left flex flex-col gap-3 opacity-60">
                <div className="p-3 bg-slate-200 text-slate-500 rounded-lg w-fit"><Lock size={24} /></div>
                <div>
                  <div className="font-bold text-slate-500 flex justify-between">ADaM <span className="text-[10px] bg-slate-200 px-1 py-0.5 rounded uppercase">Roadmap</span></div>
                  <div className="text-xs text-slate-500 mt-1">Analysis datasets pending</div>
                </div>
              </div>

              {/* Disabled ABDM */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left flex flex-col gap-3 opacity-60">
                <div className="p-3 bg-slate-200 text-slate-500 rounded-lg w-fit"><Lock size={24} /></div>
                <div>
                  <div className="font-bold text-slate-500 flex justify-between">ABDM M3 <span className="text-[10px] bg-slate-200 px-1 py-0.5 rounded uppercase">Adapter Planned</span></div>
                  <div className="text-xs text-slate-500 mt-1">NDHM / Ayushman Bharat adapter</div>
                </div>
              </div>

              {/* Disabled Define-XML */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left flex flex-col gap-3 opacity-60">
                <div className="p-3 bg-slate-200 text-slate-500 rounded-lg w-fit"><Lock size={24} /></div>
                <div>
                  <div className="font-bold text-slate-500 flex justify-between">Define-XML <span className="text-[10px] bg-slate-200 px-1 py-0.5 rounded uppercase">Roadmap</span></div>
                  <div className="text-xs text-slate-500 mt-1">Metadata exports pending</div>
                </div>
              </div>

            </div>

            {/* DSMB Summary Page */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity size={20} className="text-sky-400" />
                  <h3 className="font-bold">DSMB Interactive Summary</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Screening Flag Threshold:</span>
                  <input 
                    type="number" 
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    className="w-16 p-1 text-black text-center rounded outline-none"
                    min={1}
                  />
                  <span className="text-slate-400">events</span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4 text-sm text-slate-500">
                  Groups aggregated by verbatim term. Rows exceeding {threshold} events are automatically flagged for review. 
                  This is a simple screening flag, not a statistical signal detection algorithm.
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="p-3">AE Term</th>
                      <th className="p-3 text-center">Total Events</th>
                      <th className="p-3 text-center">Severe</th>
                      <th className="p-3 text-center">Serious (SAE)</th>
                      <th className="p-3 text-center">Likely Related</th>
                      <th className="p-3 text-center">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {aeGroupsList.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">No adverse events recorded.</td></tr>
                    ) : aeGroupsList.map((g: any) => (
                      <tr key={g.term} className={`border-b border-slate-100 ${g.count > threshold ? 'bg-amber-50' : ''}`}>
                        <td className="p-3 font-bold text-slate-700">{g.term}</td>
                        <td className="p-3 text-center font-medium">{g.count}</td>
                        <td className="p-3 text-center">{g.severe}</td>
                        <td className={`p-3 text-center font-bold ${g.serious > 0 ? 'text-red-600' : 'text-slate-400'}`}>{g.serious}</td>
                        <td className={`p-3 text-center ${g.related > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{g.related}</td>
                        <td className="p-3 text-center">
                          {g.count > threshold ? (
                            <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold uppercase">
                              <FileWarning size={12}/> Review
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </RoleGate>
  );
}
