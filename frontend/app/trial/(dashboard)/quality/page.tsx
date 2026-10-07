"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { CheckCircle, AlertTriangle, MessageSquare, Search, Save, Plus } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function QualityDesk() {
  const { userId, role } = useRole();
  const [tab, setTab] = useState("queries");
  const [loading, setLoading] = useState(true);
  
  // Data
  const [queries, setQueries] = useState<any[]>([]);
  const [deviations, setDeviations] = useState<any[]>([]);
  const [monitoring, setMonitoring] = useState<any[]>([]);
  const [subjectVisits, setSubjectVisits] = useState<any[]>([]);
  
  // Forms state
  const [devForm, setDevForm] = useState({ category: 'minor', description: '', participant_id: '' });
  const [monForm, setMonForm] = useState({ study_id: '', site_id: '', planned_on: '' });
  const [visitEditForm, setVisitEditForm] = useState<any>({});
  
  // Lookup data for forms
  const [participants, setParticipants] = useState<any[]>([]);
  const [studies, setStudies] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  const supabase = createClient();

  const fetchAll = async () => {
    try {
      const { data: qData } = await supabase.from('ct_queries').select('*, ct_studies(short_code)').order('opened_at', {ascending: false});
      const { data: dData } = await supabase.from('ct_deviations').select('*, ct_participants(subject_code)').order('created_at', {ascending: false});
      const { data: mData } = await supabase.from('ct_monitoring_visits').select('*, ct_studies(short_code), ct_sites(name)').order('planned_on', {ascending: true});
      const { data: vData } = await supabase.from('ct_visits').select('*, ct_visit_templates(name, day_offset, window_days), ct_participants(subject_code, study_id)').order('scheduled_on', {ascending: false}).limit(50);
      
      const { data: pData } = await supabase.from('ct_participants').select('id, subject_code');
      const { data: stData } = await supabase.from('ct_studies').select('id, short_code');
      const { data: siData } = await supabase.from('ct_sites').select('id, name');
      
      if (qData) setQueries(qData);
      if (dData) setDeviations(dData);
      if (mData) setMonitoring(mData);
      if (vData) setSubjectVisits(vData);
      if (pData) setParticipants(pData);
      if (stData) setStudies(stData);
      if (siData) setSites(siData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleQueryAction = async (id: string, newStatus: string) => {
    try {
      await supabase.from('ct_queries').update({
        status: newStatus,
        closed_at: newStatus === 'closed' ? new Date().toISOString() : null
      }).eq('id', id);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleAddDeviation = async () => {
    if (!devForm.participant_id || !devForm.description) return alert("Required fields missing");
    try {
      await supabase.from('ct_deviations').insert({
        participant_id: devForm.participant_id,
        category: devForm.category,
        description: devForm.description,
        status: 'open'
      });
      setDevForm({ category: 'minor', description: '', participant_id: '' });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleAddMonitoring = async () => {
    if (!monForm.study_id || !monForm.site_id || !monForm.planned_on) return alert("Required fields missing");
    try {
      await supabase.from('ct_monitoring_visits').insert({
        study_id: monForm.study_id,
        site_id: monForm.site_id,
        planned_on: monForm.planned_on,
        status: 'planned'
      });
      setMonForm({ study_id: '', site_id: '', planned_on: '' });
      fetchAll();
    } catch (e) { console.error(e); }
  };
  
  const handleCompleteMonitoring = async (id: string) => {
    const findings = prompt("Enter findings:");
    if (findings === null) return;
    try {
      await supabase.from('ct_monitoring_visits').update({
        status: 'done',
        actual_on: new Date().toISOString().split('T')[0],
        findings: findings
      }).eq('id', id);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleSaveVisit = async (visit: any) => {
    const actualOn = visitEditForm[visit.id] || visit.actual_on;
    if (!actualOn) return alert("Select an actual date");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://medikiosk-backend-ufnv.onrender.com"}/api/ct/quality/visit_save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_id: visit.id,
          actual_on: actualOn,
          status: "done"
        })
      });
      if (res.ok) {
        alert("Visit saved and edit checks run.");
        fetchAll();
      } else {
        alert("Failed to save visit");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving visit");
    }
  };

  const nowMs = Date.now();
  
  return (
    <RoleGate allow={['monitor', 'admin', 'coordinator', 'pi']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <CheckCircle size={32} className="text-emerald-500" /> Quality & Compliance
          </h1>
          <p className="text-slate-500 text-sm mt-1 mb-4">Manage Queries, Deviations, and Monitoring Visits.</p>
          <div className="bg-sky-100 p-4 rounded-xl border border-sky-200">
            <p className="text-sky-800 text-sm font-medium">
              <strong>What is this?</strong> This is the Data Monitor's workspace. It allows sponsors/monitors to resolve discrepancies (Queries) found in participant forms, record Protocol Deviations, and schedule on-site Monitoring Visits to ensure GCP compliance.
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab('queries')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'queries' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Queries ({queries.filter(q=>q.status!=='closed').length})</button>
          <button onClick={() => setTab('deviations')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'deviations' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Deviations ({deviations.length})</button>
          <button onClick={() => setTab('monitoring')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'monitoring' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Monitoring Visits ({monitoring.length})</button>
          <button onClick={() => setTab('visits')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'visits' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Subject Visits (Edit Checks)</button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading quality data...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            
            {/* Queries Tab */}
            {tab === 'queries' && (
              <div className="space-y-4">
                {queries.map(q => {
                  const ageDays = q.status !== 'closed' ? Math.floor((nowMs - new Date(q.opened_at).getTime()) / 86400000) : null;
                  return (
                    <div key={q.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs uppercase text-slate-500">{q.ct_studies?.short_code}</span>
                          <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${q.status==='open'?'bg-red-100 text-red-700':q.status==='answered'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>{q.status}</span>
                          {ageDays !== null && <span className="text-xs font-medium text-slate-500">Age: {ageDays} days</span>}
                        </div>
                        <p className="font-semibold text-slate-800">{q.text}</p>
                      </div>
                      <div className="flex gap-2">
                        {q.status === 'open' && <button onClick={()=>handleQueryAction(q.id, 'answered')} className="px-3 py-1 bg-white border border-slate-300 rounded shadow-sm text-sm font-bold">Answer</button>}
                        {q.status === 'answered' && <button onClick={()=>handleQueryAction(q.id, 'closed')} className="px-3 py-1 bg-emerald-600 text-white rounded shadow-sm text-sm font-bold">Close</button>}
                        {q.status === 'closed' && <button onClick={()=>handleQueryAction(q.id, 'open')} className="px-3 py-1 bg-white border border-slate-300 text-slate-500 rounded shadow-sm text-sm font-bold">Re-open</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deviations Tab */}
            {tab === 'deviations' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold mb-1">Participant</label>
                    <select value={devForm.participant_id} onChange={e=>setDevForm({...devForm, participant_id: e.target.value})} className="p-2 border rounded text-sm w-48">
                      <option value="">-- Select --</option>
                      {participants.map(p => <option key={p.id} value={p.id}>{p.subject_code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Category</label>
                    <select value={devForm.category} onChange={e=>setDevForm({...devForm, category: e.target.value})} className="p-2 border rounded text-sm w-32">
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold mb-1">Description</label>
                    <input type="text" value={devForm.description} onChange={e=>setDevForm({...devForm, description: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="Deviation details..." />
                  </div>
                  <button onClick={handleAddDeviation} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-1"><Plus size={16}/> Record</button>
                </div>
                
                <div className="space-y-2">
                  {deviations.map(d => (
                    <div key={d.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">{d.ct_participants?.subject_code}</div>
                        <div className="font-medium text-slate-800">{d.description}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${d.category==='major'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-700'}`}>{d.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoring Tab */}
            {tab === 'monitoring' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold mb-1">Study</label>
                    <select value={monForm.study_id} onChange={e=>setMonForm({...monForm, study_id: e.target.value})} className="p-2 border rounded text-sm w-40">
                      <option value="">-- Select --</option>
                      {studies.map(s => <option key={s.id} value={s.id}>{s.short_code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Site</label>
                    <select value={monForm.site_id} onChange={e=>setMonForm({...monForm, site_id: e.target.value})} className="p-2 border rounded text-sm w-40">
                      <option value="">-- Select --</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Planned Date</label>
                    <input type="date" value={monForm.planned_on} onChange={e=>setMonForm({...monForm, planned_on: e.target.value})} className="p-2 border rounded text-sm" />
                  </div>
                  <button onClick={handleAddMonitoring} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-1"><Plus size={16}/> Plan Visit</button>
                </div>

                <div className="space-y-2">
                  {monitoring.map(m => (
                    <div key={m.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center bg-white shadow-sm">
                      <div>
                        <div className="font-bold text-slate-800">{m.ct_studies?.short_code} - {m.ct_sites?.name}</div>
                        <div className="text-sm text-slate-500">Planned: {m.planned_on} {m.actual_on && `| Actual: ${m.actual_on}`}</div>
                        {m.findings && <div className="text-sm text-slate-700 italic mt-1">"{m.findings}"</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase text-slate-500">{m.status}</span>
                        {m.status === 'planned' && <button onClick={()=>handleCompleteMonitoring(m.id)} className="px-3 py-1 bg-white border border-slate-300 rounded shadow-sm text-sm font-bold">Mark Done</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Visits Tab */}
            {tab === 'visits' && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={18} /> Update the "Actual On" date for a visit. If it falls outside the template window (Day Offset ± Window Days), an automatic Query will be generated.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-sm text-slate-500">
                        <th className="p-3 border-b">Subject</th>
                        <th className="p-3 border-b">Visit Name</th>
                        <th className="p-3 border-b">Template Rules</th>
                        <th className="p-3 border-b">Scheduled Date</th>
                        <th className="p-3 border-b">Actual Date</th>
                        <th className="p-3 border-b">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {subjectVisits.map(v => (
                        <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium">{v.ct_participants?.subject_code}</td>
                          <td className="p-3">{v.ct_visit_templates?.name}</td>
                          <td className="p-3 text-slate-500 text-xs">Day {v.ct_visit_templates?.day_offset} ±{v.ct_visit_templates?.window_days}d</td>
                          <td className="p-3">{v.scheduled_on || '-'}</td>
                          <td className="p-3">
                            <input 
                              type="date" 
                              className="p-1 border rounded w-full"
                              value={visitEditForm[v.id] || v.actual_on || ''}
                              onChange={e => setVisitEditForm({...visitEditForm, [v.id]: e.target.value})}
                            />
                          </td>
                          <td className="p-3">
                            <button onClick={() => handleSaveVisit(v)} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700">
                              <Save size={14} /> Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </RoleGate>
  );
}
