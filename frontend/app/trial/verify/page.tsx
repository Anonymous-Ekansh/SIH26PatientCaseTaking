"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { ShieldCheck, CheckCircle2, Edit3, X, Save } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function VerifyQueue() {
  const { userId } = useRole();
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<string | null>(null); // response id
  const [editValues, setEditValues] = useState<any>({});
  const [editReason, setEditReason] = useState("");
  const supabase = createClient();

  const fetchQueue = async () => {
    try {
      const { data } = await supabase
        .from('ct_form_responses')
        .select(`
          *,
          ct_form_templates (name, kind, questions),
          ct_visits (id, participant_id, ct_participants (subject_code, study_id))
        `)
        .is('verified_at', null)
        .order('created_at', { ascending: false });
      
      if (data) setResponses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleVerify = async (res: any) => {
    if (!userId) return;
    try {
      await supabase.from('ct_form_responses').update({
        verified_by: userId,
        verified_at: new Date().toISOString()
      }).eq('id', res.id);
      
      // Mark visit done
      await supabase.from('ct_visits').update({
        status: 'done',
        actual_on: new Date().toISOString()
      }).eq('id', res.ct_visits.id);

      setResponses(prev => prev.filter(r => r.id !== res.id));
    } catch (e) {
      console.error(e);
      alert("Failed to verify");
    }
  };

  const startEdit = (res: any) => {
    setEditMode(res.id);
    setEditValues(res.answers || {});
    setEditReason("");
  };

  const saveEdit = async (res: any) => {
    if (!userId) return;
    if (!editReason.trim()) {
      alert("Please provide a reason for the edit.");
      return;
    }
    
    try {
      // Create a query audit note for the edit
      const { data: study } = await supabase.from('ct_studies').select('id').eq('id', res.ct_visits.ct_participants.study_id).single();
      
      await supabase.from('ct_queries').insert({
        study_id: study?.id,
        form_response_id: res.id,
        raised_by: userId,
        text: `Data Edit Reason: ${editReason}\nOriginal: ${JSON.stringify(res.answers)}\nNew: ${JSON.stringify(editValues)}`,
        status: 'closed',
        opened_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      });

      // Update response
      await supabase.from('ct_form_responses').update({
        answers: editValues,
        verified_by: userId,
        verified_at: new Date().toISOString()
      }).eq('id', res.id);
      
      // Mark visit done
      await supabase.from('ct_visits').update({
        status: 'done',
        actual_on: new Date().toISOString()
      }).eq('id', res.ct_visits.id);

      setResponses(prev => prev.filter(r => r.id !== res.id));
      setEditMode(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save edit");
    }
  };

  return (
    <RoleGate allow={['pi', 'coordinator', 'monitor']}>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={28} className="text-sky-500" /> Verify Queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review and verify data entered by participants via Voice Kiosk.</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading unverified responses...</div>
        ) : (
          <div className="space-y-4">
            {responses.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 font-medium shadow-sm">
                Queue is empty. All responses verified! 🎉
              </div>
            ) : (
              responses.map(res => (
                <div key={res.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 block">Subject: {res.ct_visits?.ct_participants?.subject_code}</span>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        {res.ct_form_templates?.name} 
                        <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded font-semibold uppercase">{res.source}</span>
                      </h3>
                    </div>
                    <div className="text-sm text-slate-400 font-medium">
                      {new Date(res.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      {res.ct_form_templates?.questions?.map((q: any) => {
                        const originalVal = res.answers?.[q.id];
                        const isEditing = editMode === res.id;
                        
                        return (
                          <div key={q.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                            <label className="block text-sm font-bold text-slate-700 mb-2">{q.text_en}</label>
                            
                            {isEditing ? (
                              <div className="flex gap-2">
                                {q.type === 'free_text' ? (
                                  <textarea 
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                                    value={editValues[q.id] || ''}
                                    onChange={(e) => setEditValues({ ...editValues, [q.id]: e.target.value })}
                                  />
                                ) : (
                                  <select 
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                                    value={editValues[q.id] || ''}
                                    onChange={(e) => setEditValues({ ...editValues, [q.id]: e.target.value })}
                                  >
                                    <option value="">Select...</option>
                                    {q.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                )}
                                <div className="text-xs text-slate-400 whitespace-nowrap self-center bg-slate-100 px-2 py-1 rounded">Original: {originalVal}</div>
                              </div>
                            ) : (
                              <div className="text-slate-900 bg-slate-50 p-3 rounded-lg font-medium border border-slate-100">
                                {originalVal || <span className="text-slate-400 italic">No answer</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    {editMode === res.id ? (
                      <div className="flex-1 flex gap-4 items-center">
                        <input 
                          type="text" 
                          placeholder="Reason for editing (required)"
                          className="flex-1 p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-amber-500"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                        />
                        <button onClick={() => saveEdit(res)} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors">
                          <Save size={18} /> Save & Verify
                        </button>
                        <button onClick={() => setEditMode(null)} className="px-4 py-2 bg-white text-slate-600 font-bold border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                          <X size={18} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3 w-full">
                        <button onClick={() => startEdit(res)} className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                          <Edit3 size={18} /> Edit
                        </button>
                        <button onClick={() => handleVerify(res)} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm">
                          <CheckCircle2 size={18} /> Verify
                        </button>
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
