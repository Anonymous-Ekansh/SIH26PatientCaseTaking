"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { FileCheck, Shield, Calendar, Plus, Clock, FilePlus, Users } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function RegulatoryDesk() {
  const { userId, role } = useRole();
  const [studies, setStudies] = useState<any[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState("");
  
  const [approvals, setApprovals] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [consentVersions, setConsentVersions] = useState<any[]>([]);
  const [reconsentNeeded, setReconsentNeeded] = useState<any[]>([]);
  const [studyInfo, setStudyInfo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  // Forms
  const [ethForm, setEthForm] = useState({ committee_name: '', approval_date: '', valid_until: '', status: 'approved' });
  const [amendForm, setAmendForm] = useState({ version: '2.0', language: 'en', effective_date: '' });
  const [ctriForm, setCtriForm] = useState({ ctri_number: '', ctri_update_due: '' });

  const supabase = createClient();

  const fetchStudies = async () => {
    try {
      const { data } = await supabase.from('ct_studies').select('id, short_code, title').order('short_code');
      if (data) {
        setStudies(data);
        if (data.length > 0 && !selectedStudyId) setSelectedStudyId(data[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudyDetails = async () => {
    if (!selectedStudyId) return;
    try {
      const { data: stData } = await supabase.from('ct_studies').select('*').eq('id', selectedStudyId).single();
      const { data: ethData } = await supabase.from('ct_ethics_approvals').select('*').eq('study_id', selectedStudyId).order('valid_until', {ascending: false});
      const { data: mData } = await supabase.from('ct_milestones').select('*').eq('study_id', selectedStudyId).order('planned_date', {ascending: true});
      const { data: cData } = await supabase.from('ct_consent_versions').select('*').eq('study_id', selectedStudyId).order('created_at', {ascending: false});
      
      setStudyInfo(stData);
      setCtriForm({ ctri_number: stData.ctri_number || '', ctri_update_due: stData.ctri_update_due || '' });
      setApprovals(ethData || []);
      setMilestones(mData || []);
      setConsentVersions(cData || []);
      
      // Calculate re-consent needed
      if (cData && cData.length > 0) {
        const latestVersionId = cData[0].id; // newest created
        // Active participants: status = enrolled
        const { data: pData } = await supabase.from('ct_participants')
          .select('id, subject_code, status, ct_consents(consent_version_id)')
          .eq('study_id', selectedStudyId)
          .eq('status', 'enrolled');
          
        if (pData) {
          const needing = pData.filter(p => {
            const hasLatest = p.ct_consents?.some((c:any) => c.consent_version_id === latestVersionId);
            return !hasLatest;
          });
          setReconsentNeeded(needing);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchStudyDetails();
  }, [selectedStudyId]);

  const saveCtri = async () => {
    try {
      await supabase.from('ct_studies').update(ctriForm).eq('id', selectedStudyId);
      alert("CTRI info updated!");
      fetchStudyDetails();
    } catch (e) { console.error(e); }
  };

  const addApproval = async () => {
    try {
      await supabase.from('ct_ethics_approvals').insert({
        study_id: selectedStudyId,
        ...ethForm
      });
      setEthForm({ committee_name: '', approval_date: '', valid_until: '', status: 'approved' });
      fetchStudyDetails();
    } catch (e) { console.error(e); }
  };

  const addAmendment = async () => {
    try {
      await supabase.from('ct_consent_versions').insert({
        study_id: selectedStudyId,
        ...amendForm,
        body_text: "Amended protocol standard text..."
      });
      setAmendForm({ version: '', language: 'en', effective_date: '' });
      alert("Protocol amendment registered.");
      fetchStudyDetails();
    } catch (e) { console.error(e); }
  };

  const getSlippage = (planned: string, actual: string) => {
    if (!planned || !actual) return null;
    const diff = (new Date(actual).getTime() - new Date(planned).getTime()) / 86400000;
    return Math.floor(diff);
  };

  const nowMs = Date.now();

  return (
    <RoleGate allow={['leadership', 'admin', 'regulator_ro', 'ethics_committee']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <FileCheck size={32} className="text-indigo-600" /> Regulatory Affairs
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage IEC Approvals, CTRI, Milestones, and Protocol Amendments.</p>
          </div>
          <div className="flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase px-2">Study</span>
            <select 
              value={selectedStudyId} 
              onChange={e => setSelectedStudyId(e.target.value)}
              className="p-2 border-l border-slate-200 bg-transparent font-bold outline-none cursor-pointer text-indigo-700"
            >
              {studies.map(s => <option key={s.id} value={s.id}>{s.short_code}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading regulatory data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Col: CTRI & Ethics */}
            <div className="space-y-6">
              
              {/* CTRI Info */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Calendar size={18} className="text-slate-500" /> CTRI Registration</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">CTRI Number</label>
                    <input type="text" value={ctriForm.ctri_number} onChange={e=>setCtriForm({...ctriForm, ctri_number: e.target.value})} className="w-full p-2 border rounded bg-slate-50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Update Due Date</label>
                    <input type="date" value={ctriForm.ctri_update_due} onChange={e=>setCtriForm({...ctriForm, ctri_update_due: e.target.value})} className="w-full p-2 border rounded bg-slate-50" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={saveCtri} className="bg-slate-800 text-white font-bold py-2 px-4 rounded hover:bg-slate-700 text-sm">Save CTRI</button>
                </div>
              </div>

              {/* Ethics Approvals */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Shield size={18} className="text-emerald-500" /> IEC Approvals</h3>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 flex flex-wrap gap-2">
                  <input type="text" placeholder="Committee Name" value={ethForm.committee_name} onChange={e=>setEthForm({...ethForm, committee_name: e.target.value})} className="flex-1 p-2 border rounded text-sm min-w-[200px]" />
                  <input type="date" placeholder="Approval" value={ethForm.approval_date} onChange={e=>setEthForm({...ethForm, approval_date: e.target.value})} className="w-32 p-2 border rounded text-sm" />
                  <input type="date" placeholder="Valid Until" value={ethForm.valid_until} onChange={e=>setEthForm({...ethForm, valid_until: e.target.value})} className="w-32 p-2 border rounded text-sm" />
                  <button onClick={addApproval} className="bg-emerald-600 text-white font-bold px-4 py-2 rounded flex items-center gap-1 hover:bg-emerald-700"><Plus size={16}/> Add</button>
                </div>

                <div className="space-y-3">
                  {approvals.length === 0 ? <p className="text-sm text-slate-500 italic">No approvals found.</p> : approvals.map(app => {
                    const isExpiring = app.valid_until && new Date(app.valid_until).getTime() - nowMs < (30 * 86400000);
                    const isExpired = app.valid_until && new Date(app.valid_until).getTime() < nowMs;
                    return (
                      <div key={app.id} className={`p-4 border rounded-lg ${isExpired ? 'border-red-200 bg-red-50' : isExpiring ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-sm">{app.committee_name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isExpired ? 'bg-red-200 text-red-800' : isExpiring ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : app.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 flex gap-4">
                          <span>Approved: {app.approval_date}</span>
                          <span className="font-bold text-slate-700">Valid Until: {app.valid_until}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Milestones & Protocol Amendments */}
            <div className="space-y-6">
              
              {/* Milestones */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Clock size={18} className="text-sky-500" /> Milestones & Slippage</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs font-bold text-slate-500 pb-2 border-b">
                    <div className="col-span-1">Milestone</div>
                    <div>Planned</div>
                    <div>Actual</div>
                    <div className="text-right">Slippage</div>
                  </div>
                  {milestones.length === 0 ? <p className="text-sm text-slate-500 italic mt-4">No milestones defined.</p> : milestones.map(m => {
                    const slip = getSlippage(m.planned_date, m.actual_date);
                    return (
                      <div key={m.id} className="grid grid-cols-4 items-center text-sm py-2 border-b border-slate-50">
                        <div className="col-span-1 font-medium capitalize truncate" title={m.type.replace('_', ' ')}>{m.type.replace('_', ' ')}</div>
                        <div className="text-slate-500">{m.planned_date || '-'}</div>
                        <div className="font-bold">{m.actual_date || '-'}</div>
                        <div className={`text-right font-bold ${slip === null ? 'text-slate-400' : slip > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {slip === null ? '-' : slip > 0 ? `+${slip}d` : `${slip}d`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Protocol Amendments & Re-consent */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex justify-between items-center mb-4 border-b pb-2">
                  <div className="flex items-center gap-2"><FilePlus size={18} className="text-rose-500" /> Protocol Amendments</div>
                </h3>
                
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 mb-4 flex flex-wrap gap-2">
                  <input type="text" placeholder="Version (e.g. 2.0)" value={amendForm.version} onChange={e=>setAmendForm({...amendForm, version: e.target.value})} className="w-24 p-2 border border-rose-200 rounded text-sm" />
                  <select value={amendForm.language} onChange={e=>setAmendForm({...amendForm, language: e.target.value})} className="p-2 border border-rose-200 rounded text-sm bg-white">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                  <input type="date" value={amendForm.effective_date} onChange={e=>setAmendForm({...amendForm, effective_date: e.target.value})} className="flex-1 p-2 border border-rose-200 rounded text-sm" />
                  <button onClick={addAmendment} className="bg-rose-600 text-white font-bold px-4 py-2 rounded text-sm hover:bg-rose-700">Publish Amendment</button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Consent Versions History</h4>
                    <div className="flex flex-wrap gap-2">
                      {consentVersions.map((cv, idx) => (
                        <div key={cv.id} className={`px-3 py-1 rounded text-sm font-bold border ${idx === 0 ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          v{cv.version} ({cv.language})
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {reconsentNeeded.length > 0 && (
                    <div className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><Users size={16}/> Active Participants Needing Re-consent</h4>
                      <div className="flex flex-wrap gap-2">
                        {reconsentNeeded.map(p => (
                          <span key={p.id} className="bg-white border border-amber-200 text-amber-900 px-2 py-1 rounded text-xs font-bold shadow-sm">
                            {p.subject_code}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-700 mt-2">These enrolled subjects have not signed the latest protocol amendment.</p>
                    </div>
                  )}
                  {reconsentNeeded.length === 0 && consentVersions.length > 0 && (
                     <p className="text-sm text-emerald-600 font-medium">All active participants are on the latest consent version.</p>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
