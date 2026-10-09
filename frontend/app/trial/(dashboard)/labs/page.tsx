"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { Upload, FileText, CheckCircle, Edit2, AlertTriangle, Eye } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function LabsDesk() {
  const { userId } = useRole();
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [visits, setVisits] = useState<any[]>([]);
  const supabase = createClient();

  const fetchLabs = async () => {
    try {
      const { data } = await supabase
        .from('ct_lab_documents')
        .select(`
          *,
          ct_visits (id, participant_id, ct_participants (subject_code, study_id))
        `)
        .eq('status', 'extracted')
        .order('created_at', { ascending: false });
      
      if (data) setLabs(data);
      
      // Fetch all visits for dropdown
      const { data: vData } = await supabase
        .from('ct_visits')
        .select('id, participant_id, ct_participants (subject_code)')
        .limit(50);
      if (vData) setVisits(vData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedVisitId) {
      alert("Please select a visit and a file.");
      return;
    }
    const file = e.target.files[0];
    setUploading(true);
    
    try {
      const visit = visits.find(v => v.id === selectedVisitId);
      const formData = new FormData();
      formData.append("study_id", visit.ct_participants.study_id || "demo_study");
      formData.append("participant_id", visit.participant_id);
      formData.append("visit_id", visit.id);
      formData.append("file", file);

      const apiUrl = "https://medikiosk-backend-ufnv.onrender.com";
      const res = await fetch(`${apiUrl}/api/ct/labs/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      alert("Extraction complete!");
      fetchLabs();
    } catch (e) {
      console.error(e);
      alert("Upload error.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async (lab: any) => {
    if (!userId) return;
    try {
      // Find a template id to satisfy NOT NULL constraint
      const { data: templates } = await supabase.from("ct_form_templates").select("id").limit(1);
      const templateId = templates?.[0]?.id;

      if (templateId) {
        await supabase.from("ct_form_responses").insert({
          visit_id: lab.visit_id,
          form_template_id: templateId,
          answers: lab.extracted,
          source: 'ocr',
          verified_by: userId,
          verified_at: new Date().toISOString()
        });
      }

      await supabase.from("ct_lab_documents").update({ status: "confirmed" }).eq("id", lab.id);
      setLabs(prev => prev.filter(l => l.id !== lab.id));
    } catch (e) {
      console.error(e);
      alert("Confirmation failed");
    }
  };

  return (
    <RoleGate allow={['pi', 'coordinator', 'monitor', 'admin']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText size={28} className="text-indigo-500" /> Lab OCR & Verification
            </h1>
            <p className="text-slate-500 text-sm mt-1">Upload lab PDFs/images and verify Sarvam OCR extraction.</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <select 
              className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
              value={selectedVisitId}
              onChange={e => setSelectedVisitId(e.target.value)}
            >
              <option value="">-- Select Subject Visit --</option>
              {visits.map(v => (
                <option key={v.id} value={v.id}>{v.ct_participants?.subject_code} (Visit {v.id.substring(0,8)})</option>
              ))}
            </select>
            <label className="cursor-pointer bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors">
              {uploading ? <span className="animate-pulse">Extracting...</span> : <><Upload size={18} /> Upload Lab</>}
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading || !selectedVisitId} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading extracted labs...</div>
        ) : (
          <div className="space-y-4">
            {labs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 font-medium shadow-sm">
                No pending lab documents to review.
              </div>
            ) : (
              labs.map(lab => (
                <div key={lab.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
                  
                  {/* Left: Document View (Placeholder if image not publicly readable, we show path) */}
                  <div className="lg:w-1/3 bg-slate-900 p-6 flex flex-col items-center justify-center text-slate-400 border-r border-slate-200">
                    <Eye size={48} className="mb-4 text-slate-600" />
                    <p className="text-sm font-medium mb-2 break-all text-center">{lab.file_path}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Document Preview Available via Bucket</p>
                  </div>

                  {/* Right: Extracted Values */}
                  <div className="flex-1 flex flex-col">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Subject: {lab.ct_visits?.ct_participants?.subject_code}</span>
                        <h3 className="font-bold text-slate-900 text-lg">Extracted Entities (Sarvam + LLM)</h3>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(lab.extracted || {}).map(([key, data]: [string, any]) => (
                          <div key={key} className={`p-4 rounded-xl border-2 ${data.is_abnormal ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <label className="text-sm font-bold text-slate-700 capitalize">{key}</label>
                              {data.is_abnormal && <AlertTriangle size={16} className="text-red-500" />}
                            </div>
                            <div className="flex gap-2 items-center">
                              <input 
                                type="text"
                                className={`flex-1 p-2 border rounded font-semibold text-lg outline-none ${data.is_abnormal ? 'border-red-300 text-red-900 focus:ring-red-500' : 'border-slate-300 text-slate-900 focus:ring-indigo-500'}`}
                                defaultValue={data.value}
                                onChange={(e) => {
                                  lab.extracted[key].value = e.target.value;
                                }}
                              />
                              <span className="text-slate-500 font-bold">{data.unit}</span>
                            </div>
                            {data.ref_range && <div className="text-xs text-slate-500 mt-2 font-medium">Ref: {data.ref_range}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                      <button className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Edit2 size={18} /> Edit Raw JSON
                      </button>
                      <button onClick={() => handleConfirm(lab)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm">
                        <CheckCircle size={18} /> Confirm Extraction
                      </button>
                    </div>
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
