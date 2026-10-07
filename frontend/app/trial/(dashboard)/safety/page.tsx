"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { ShieldAlert, AlertTriangle, CheckCircle, Search, Clock, FileText, X, Shield, Send, Lock } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import SignOffModal from "@/app/components/trial/SignOffModal";

const SERIOUSNESS_CRITERIA = [
  "death", "life_threatening", "hospitalisation", "disability", "congenital_anomaly", "medically_important"
];
const CAUSALITY_OPTIONS = ["certain", "probable", "possible", "unlikely", "conditional", "unassessable"];
const SEVERITY_OPTIONS = ["mild", "moderate", "severe"];

export default function SafetyDesk() {
  const { userId, role } = useRole();
  const [aes, setAes] = useState<any[]>([]);
  const [clocks, setClocks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [codings, setCodings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("candidates");
  
  // detail modal state
  const [selectedAe, setSelectedAe] = useState<any>(null);
  
  // confirm form state
  const [severity, setSeverity] = useState("mild");
  const [seriousnessCriteria, setSeriousnessCriteria] = useState<string[]>([]);
  const [causality, setCausality] = useState("");
  const [causalityNote, setCausalityNote] = useState("");
  const [outcome, setOutcome] = useState("recovering");
  const [actionTaken, setActionTaken] = useState("none");
  const [rejectReason, setRejectReason] = useState("");
  
  // coding state
  const [searchTerm, setSearchTerm] = useState("");
  const [dictResults, setDictResults] = useState<any[]>([]);
  
  // reporting state
  const [reportForm, setReportForm] = useState({ narrative: "", reporter: "" });
  
  // EC state
  const [ecNote, setEcNote] = useState("");
  
  // E-Sig state
  const [sigOpen, setSigOpen] = useState(false);
  const [sigConfig, setSigConfig] = useState<any>(null);

  const supabase = createClient();

  const fetchAll = async () => {
    try {
      const { data: aeData } = await supabase
        .from('ct_adverse_events')
        .select('*, ct_participants (subject_code)')
        .order('aware_at', { ascending: false });
      
      const { data: clockData } = await supabase.from('ct_ae_clocks').select('*');
      const { data: reportData } = await supabase.from('ct_regulatory_reports').select('*');
      const { data: codingData } = await supabase.from('ct_ae_coding').select('*');
      
      if (aeData) setAes(aeData);
      if (clockData) setClocks(clockData);
      if (reportData) setReports(reportData);
      if (codingData) setCodings(codingData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      supabase.from('ct_dictionary_demo').select('*').ilike('term', `%${searchTerm}%`).limit(5)
        .then(({ data }) => setDictResults(data || []));
    } else {
      setDictResults([]);
    }
  }, [searchTerm]);

  const handleConfirm = async (meaning: string) => {
    if (!userId || !selectedAe) return;
    if (!causality || !causalityNote.trim()) {
      alert("Causality and Causality Note are required.");
      return;
    }
    
    const isSerious = seriousnessCriteria.length > 0;
    
    try {
      await supabase.from('ct_adverse_events').update({
        status: 'open',
        severity,
        serious: isSerious,
        seriousness_criteria: seriousnessCriteria,
        causality,
        causality_note: causalityNote,
        outcome,
        action_taken: actionTaken,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString()
      }).eq('id', selectedAe.id);

      if (isSerious) {
        const { data: rulePack } = await supabase.from('ct_rule_packs').select('*').order('created_at', { ascending: false }).limit(1).single();
        if (rulePack) {
          const rules = rulePack.rules;
          const awareAt = new Date(selectedAe.aware_at).getTime();
          const clocksToInsert = [];
          
          const initialDue = new Date(awareAt + rules.investigator_initial_hours * 3600 * 1000);
          clocksToInsert.push({ ae_id: selectedAe.id, rule_pack_id: rulePack.id, milestone: 'initial_report', recipient: 'cdsco', due_at: initialDue.toISOString() });
          
          const detailedDue = new Date(awareAt + rules.investigator_detailed_days * 24 * 3600 * 1000);
          clocksToInsert.push({ ae_id: selectedAe.id, rule_pack_id: rulePack.id, milestone: 'detailed_report', recipient: 'cdsco', due_at: detailedDue.toISOString() });
          
          const ecDue = new Date(awareAt + rules.ethics_committee_days * 24 * 3600 * 1000);
          clocksToInsert.push({ ae_id: selectedAe.id, rule_pack_id: rulePack.id, milestone: 'ec_report', recipient: 'ethics_committee', due_at: ecDue.toISOString() });
          
          await supabase.from('ct_ae_clocks').insert(clocksToInsert);
        }
      }
      
      // We can create the esig entry since we're in the success block of the modal
      await supabase.from('ct_esignatures').insert({
        user_id: userId,
        record_table: 'ct_adverse_events',
        record_id: selectedAe.id,
        meaning: meaning || 'reviewed',
        signed_at: new Date().toISOString(),
        record_hash: 'hash_' + Date.now() // prototype mock
      });
      
      setSelectedAe(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      alert("Failed to confirm AE");
    }
  };
  
  const promptConfirmAe = () => {
    if (!causality || !outcome || !actionTaken) {
      alert("Please complete required medical assessment fields.");
      return;
    }
    setSigConfig({
      title: "Confirm AE Medical Assessment",
      table: "ct_adverse_events",
      recordId: selectedAe.id,
      onSign: handleConfirm
    });
    setSigOpen(true);
  };

  const handleReject = async () => {
    if (!userId || !selectedAe) return;
    if (!rejectReason.trim()) {
      alert("Reject reason is required.");
      return;
    }
    try {
      await supabase.from('ct_adverse_events').update({
        status: 'rejected',
        reject_reason: rejectReason,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString()
      }).eq('id', selectedAe.id);
      setSelectedAe(null);
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCodeSelect = async (dictTerm: any) => {
    if (!userId || !selectedAe) return;
    try {
      await supabase.from('ct_ae_coding').insert({
        ae_id: selectedAe.id,
        dictionary: 'demo',
        code: dictTerm.code,
        term: dictTerm.term,
        soc: dictTerm.soc,
        coded_by: userId,
        coded_at: new Date().toISOString()
      });
      setSearchTerm("");
      fetchAll();
    } catch(e) {
      console.error(e);
    }
  };

  const submitReport = async (clock: any) => {
    if (!userId || !selectedAe) return;
    try {
      const { data } = await supabase.from('ct_regulatory_reports').insert({
        ae_id: selectedAe.id,
        report_type: clock.milestone,
        recipient: clock.recipient,
        submitted_at: new Date().toISOString(),
        payload: {
          ...reportForm,
          event: selectedAe.verbatim_term,
          onset: selectedAe.onset_at,
          seriousness: selectedAe.seriousness_criteria,
          causality: selectedAe.causality,
          outcome: selectedAe.outcome,
          action_taken: selectedAe.action_taken
        }
      }).select().single();
      
      if (data) {
        await supabase.from('ct_ae_clocks').update({ satisfied_at: new Date().toISOString() }).eq('id', clock.id);
      }
      setReportForm({ narrative: "", reporter: "" });
      fetchAll();
    } catch(e) {
      console.error(e);
    }
  };

  const handleEcNoteSign = async (meaning: string) => {
    if (!userId || !ecNote.trim() || !sigConfig) return;
    try {
      await supabase.from('ct_esignatures').insert({
        user_id: userId,
        record_table: 'ct_regulatory_reports',
        record_id: sigConfig.recordId,
        meaning: meaning || 'reviewed',
        signed_at: new Date().toISOString(),
        record_hash: 'mock_hash_' + Date.now()
      });
      setEcNote("");
      alert("Note added and e-signed!");
    } catch (e) {
      console.error(e);
    }
  };

  const promptEcNote = (reportId: string) => {
    if (!ecNote.trim()) {
      alert("Please enter an EC opinion.");
      return;
    }
    setSigConfig({
      title: "Sign EC Opinion",
      table: "ct_regulatory_reports",
      recordId: reportId,
      onSign: handleEcNoteSign
    });
    setSigOpen(true);
  };

  const openAe = (ae: any) => {
    setSelectedAe(ae);
    setSeverity(ae.severity || "mild");
    setSeriousnessCriteria(ae.seriousness_criteria || []);
    setCausality(ae.causality || "");
    setCausalityNote(ae.causality_note || "");
    setOutcome(ae.outcome || "recovering");
    setActionTaken(ae.action_taken || "none");
    setRejectReason(ae.reject_reason || "");
  };

  const toggleSerious = (c: string) => {
    if (seriousnessCriteria.includes(c)) {
      setSeriousnessCriteria(prev => prev.filter(x => x !== c));
    } else {
      setSeriousnessCriteria(prev => [...prev, c]);
    }
  };

  // Filter AEs
  const candidates = aes.filter(a => a.status === 'candidate');
  const confirmed = aes.filter(a => a.status === 'open' && !a.serious);
  const serious = aes.filter(a => a.status === 'open' && a.serious);
  
  // Find overdue clocks
  const now = new Date().getTime();
  const overdueClocks = clocks.filter(c => !c.satisfied_at && new Date(c.due_at).getTime() < now);
  const overdueAeIds = new Set(overdueClocks.map(c => c.ae_id));
  const overdue = aes.filter(a => overdueAeIds.has(a.id));
  
  let currentList = [];
  if (tab === 'candidates') currentList = candidates;
  if (tab === 'confirmed') currentList = confirmed;
  if (tab === 'serious') currentList = serious;
  if (tab === 'overdue') currentList = overdue;

  const getClockColor = (clock: any) => {
    if (clock.satisfied_at) return "text-emerald-600 bg-emerald-50";
    const dueTime = new Date(clock.due_at).getTime();
    const createdTime = new Date(clock.created_at).getTime();
    const totalDuration = dueTime - createdTime;
    const remaining = dueTime - now;
    if (remaining < 0) return "text-red-600 bg-red-50 border-red-200";
    if (remaining < (totalDuration / 2)) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  return (
    <RoleGate allow={['pi', 'coordinator', 'pharmacovigilance', 'ethics_committee', 'regulator_ro', 'admin']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div className="w-full">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert size={32} className="text-red-500" /> Safety & PV Desk
            </h1>
            <p className="text-slate-500 text-sm mt-2 mb-4">Manage Adverse Events, SAE Clocks, and Regulatory Reporting.</p>
            <div className="bg-sky-100 p-4 rounded-xl border border-sky-200">
              <p className="text-sky-800 text-sm font-medium">
                <strong>What is this?</strong> This is the Pharmacovigilance (Safety) Desk. It automatically flags severe side-effects reported by patients. The PV team can medically assess Adverse Events (AEs) using CDISC terminology and generate automatic compliance clocks for CDSCO and Ethics Committee reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab('candidates')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'candidates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            Candidates ({candidates.length})
          </button>
          <button onClick={() => setTab('confirmed')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'confirmed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            Confirmed AEs ({confirmed.length})
          </button>
          <button onClick={() => setTab('serious')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'serious' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            Serious (SAEs) ({serious.length})
          </button>
          <button onClick={() => setTab('overdue')} className={`px-4 py-3 font-bold border-b-2 ${tab === 'overdue' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>
            Overdue ({overdue.length})
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center font-medium text-slate-500">Loading safety data...</div>
        ) : (
          <div className="space-y-4">
            {currentList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 shadow-sm">
                No records found in this queue.
              </div>
            ) : (
              currentList.map(ae => (
                <div key={ae.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex justify-between items-center hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-sm font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{ae.ct_participants?.subject_code}</span>
                      {ae.serious && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">Serious</span>}
                      {overdueAeIds.has(ae.id) && <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded uppercase animate-pulse">Overdue Report</span>}
                    </div>
                    <h3 className="font-bold text-xl text-slate-900">{ae.verbatim_term}</h3>
                    <p className="text-slate-500 text-sm">Aware: {new Date(ae.aware_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => openAe(ae)} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100">
                    Open Case File
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* AE Detail Modal */}
        {selectedAe && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Case File: {selectedAe.verbatim_term}</h2>
                  <p className="text-slate-500">Subject: {selectedAe.ct_participants?.subject_code} | Source: {selectedAe.source}</p>
                </div>
                <button onClick={() => setSelectedAe(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} className="text-slate-500" /></button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Col: Case Details & Coding */}
                <div className="space-y-6">
                  
                  {/* Additional Context */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm flex justify-between">
                    <div><span className="font-bold text-slate-600">Aware:</span> {new Date(selectedAe.aware_at).toLocaleString()}</div>
                    <div><span className="font-bold text-slate-600">Onset:</span> {selectedAe.onset_at ? new Date(selectedAe.onset_at).toLocaleString() : 'Unknown'}</div>
                  </div>

                  {/* Candidate Confirmation Form */}
                  {selectedAe.status === 'candidate' && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                      <h3 className="font-bold text-slate-800 border-b pb-2">Clinical Evaluation</h3>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Severity</label>
                        <select value={severity} onChange={e=>setSeverity(e.target.value)} className="w-full p-2 border rounded">
                          {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Seriousness Criteria</label>
                        <div className="space-y-1">
                          {SERIOUSNESS_CRITERIA.map(c => (
                            <label key={c} className="flex items-center gap-2 text-sm text-slate-600">
                              <input type="checkbox" checked={seriousnessCriteria.includes(c)} onChange={() => toggleSerious(c)} />
                              {c.replace('_', ' ')}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Causality (WHO-UMC) *</label>
                        <select value={causality} onChange={e=>setCausality(e.target.value)} className="w-full p-2 border rounded">
                          <option value="">-- Select --</option>
                          {CAUSALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Outcome</label>
                        <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full p-2 border rounded">
                          <option value="recovering">Recovering / Resolving</option>
                          <option value="recovered">Recovered / Resolved</option>
                          <option value="not_recovered">Not Recovered / Not Resolved</option>
                          <option value="fatal">Fatal</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Action Taken</label>
                        <select value={actionTaken} onChange={e=>setActionTaken(e.target.value)} className="w-full p-2 border rounded">
                          <option value="none">None</option>
                          <option value="dose_reduced">Dose Reduced</option>
                          <option value="drug_withdrawn">Drug Withdrawn</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Causality Note *</label>
                        <textarea value={causalityNote} onChange={e=>setCausalityNote(e.target.value)} className="w-full p-2 border rounded" rows={2}></textarea>
                      </div>
                      
                      <div className="pt-4 flex gap-2">
                        <button onClick={promptConfirmAe} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded shadow hover:bg-emerald-700">Confirm Event</button>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-200">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Reject Reason</label>
                         <div className="flex gap-2">
                           <input type="text" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Reason for rejection..." />
                           <button onClick={handleReject} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded hover:bg-slate-300">Reject</button>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Read-Only Details for Confirmed/Rejected */}
                  {selectedAe.status !== 'candidate' && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-slate-500">Status:</span><span className="font-bold uppercase">{selectedAe.status}</span>
                        <span className="text-slate-500">Severity:</span><span className="font-bold capitalize">{selectedAe.severity}</span>
                        <span className="text-slate-500">Serious:</span><span className="font-bold text-red-600">{selectedAe.serious ? 'Yes' : 'No'}</span>
                        <span className="text-slate-500">Causality:</span><span className="font-bold capitalize">{selectedAe.causality}</span>
                        <span className="text-slate-500">Note:</span><span className="italic">{selectedAe.causality_note}</span>
                      </div>
                      {selectedAe.serious && (
                        <div className="mt-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 flex items-center gap-1 font-medium">
                          <Shield size={14} /> Rule pack: verify before production
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medical Coding Panel */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                     <h3 className="font-bold text-slate-800 flex justify-between items-center mb-3">
                       Medical Coding
                       <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Illustrative demo dictionary, not MedDRA</span>
                     </h3>
                     
                     {/* Show existing coding */}
                     {codings.filter(c => c.ae_id === selectedAe.id).map(c => (
                        <div key={c.id} className="mb-4 bg-slate-50 p-3 rounded border border-slate-200">
                          <div className="text-sm font-black text-slate-800">{c.code}: {c.term}</div>
                          <div className="text-xs text-slate-500 mt-1">{c.soc} | Dictionary: {c.dictionary}</div>
                        </div>
                     ))}

                     {role === 'pharmacovigilance' || role === 'admin' ? (
                       <div>
                         <div className="relative">
                           <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
                           <input 
                             type="text" 
                             placeholder="Search demo dictionary..." 
                             className="w-full pl-8 p-2 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                             value={searchTerm}
                             onChange={e => setSearchTerm(e.target.value)}
                           />
                         </div>
                         {dictResults.length > 0 && (
                           <div className="mt-2 border border-slate-200 rounded shadow-sm max-h-40 overflow-y-auto">
                             {dictResults.map(dr => (
                               <div key={dr.code} onClick={() => handleCodeSelect(dr)} className="p-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm">
                                 <span className="font-bold text-slate-700">{dr.code}</span> - {dr.term}
                                 <div className="text-xs text-slate-400">{dr.soc}</div>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     ) : (
                       <p className="text-xs text-slate-400">Only PV users can code events.</p>
                     )}
                  </div>
                </div>
                
                {/* Right Col: Clocks & Reports */}
                <div className="space-y-6">
                  {selectedAe.serious && (
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <Clock size={20} className="text-indigo-500" /> Regulatory Clocks
                      </h3>
                      <div className="space-y-3">
                        {clocks.filter(c => c.ae_id === selectedAe.id).map(c => {
                          const existingReport = reports.find(r => r.ae_id === selectedAe.id && r.report_type === c.milestone);
                          const colorClass = getClockColor(c);
                          
                          return (
                            <div key={c.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${colorClass}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-bold uppercase tracking-wider text-sm">{c.milestone.replace('_', ' ')}</div>
                                  <div className="text-xs mt-1">Due: {new Date(c.due_at).toLocaleString()}</div>
                                </div>
                                {c.satisfied_at && <CheckCircle className="text-emerald-500" />}
                              </div>
                              
                              {/* Report Action */}
                              {!c.satisfied_at && (role === 'pi' || role === 'admin' || role === 'coordinator') && (
                                <div className="bg-white/80 p-3 rounded border border-black/10 mt-2">
                                  <h4 className="text-xs font-bold mb-2">Submit Report</h4>
                                  <textarea placeholder="Narrative..." className="w-full p-2 text-sm border rounded mb-2 bg-white" rows={2} value={reportForm.narrative} onChange={e=>setReportForm({...reportForm, narrative: e.target.value})}></textarea>
                                  <div className="flex gap-2 mb-2">
                                    <input type="text" placeholder="Reporter Name" className="w-full p-2 text-sm border rounded bg-white" value={reportForm.reporter} onChange={e=>setReportForm({...reportForm, reporter: e.target.value})}/>
                                  </div>
                                  <button onClick={() => submitReport(c)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 rounded text-sm hover:bg-indigo-700">
                                    <Send size={14} /> Mark as Submitted
                                  </button>
                                  <div className="text-center text-[10px] text-slate-500 mt-2 uppercase font-medium">Prototype format, not an official CDSCO/SUGAM submission</div>
                                </div>
                              )}
                              
                              {/* Show submitted report details */}
                              {existingReport && (
                                <div className="mt-2 bg-white/50 p-3 rounded text-sm border border-black/5">
                                  <div className="font-bold flex items-center gap-1 mb-1"><FileText size={14} /> Submitted on {new Date(existingReport.submitted_at).toLocaleDateString()}</div>
                                  <div className="italic text-xs">Narrative: {existingReport.payload?.narrative}</div>
                                  
                                  {/* Ethics Committee Review View */}
                                  {c.recipient === 'ethics_committee' && (role === 'ethics_committee' || role === 'admin') && (
                                    <div className="mt-3 pt-3 border-t border-black/10">
                                      <h4 className="text-xs font-bold mb-2 text-indigo-900">EC Opinion</h4>
                                      <textarea placeholder="Write opinion note..." className="w-full p-2 text-sm border rounded mb-2 bg-white" value={ecNote} onChange={e=>setEcNote(e.target.value)}></textarea>
                                      <button onClick={() => promptEcNote(existingReport.id)} className="w-full bg-indigo-100 text-indigo-700 font-bold py-1.5 rounded text-sm hover:bg-indigo-200">
                                        E-Sign Opinion
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {clocks.filter(c => c.ae_id === selectedAe.id).length === 0 && <div className="text-sm text-slate-500 italic">No clocks generated.</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {sigOpen && (
          <SignOffModal 
            isOpen={sigOpen}
            onClose={() => setSigOpen(false)}
            onSign={sigConfig.onSign}
            title={sigConfig.title}
            table={sigConfig.table}
            recordId={sigConfig.recordId}
          />
        )}
      </div>
    </RoleGate>
  );
}
