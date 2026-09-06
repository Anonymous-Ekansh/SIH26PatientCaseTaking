"use client";

import { useEffect, useState, use } from "react";
import { 
  ClipboardCheck, 
  FileText, 
  Stethoscope, 
  Activity, 
  Pill, 
  AlertTriangle,
  Leaf,
  ArrowLeft,
  Save,
  Edit3,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DoctorPatientSummary({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [conversation, setConversation] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [ayushData, setAyushData] = useState<any>(null);
  const [patientName, setPatientName] = useState("");

  // Editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [editedChiefComplaint, setEditedChiefComplaint] = useState("");
  const [editedPastHistory, setEditedPastHistory] = useState("");
  const [editedDrugAllergy, setEditedDrugAllergy] = useState("");
  const [editedFamilyHistory, setEditedFamilyHistory] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchSummaryData() {
      try {
        const res = await fetch(`${getApiUrl()}/api/documents/patient-summary/${patientId}`);
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to load patient summary.");
        }

        const data = await res.json();

        if (data.conversation) {
          setConversation(data.conversation);
          setEditedChiefComplaint(data.conversation.chief_complaint || "");
          setEditedPastHistory(data.conversation.state?.past_history || "");
          setEditedDrugAllergy(data.conversation.state?.drug_allergy_history || "");
          setEditedFamilyHistory(data.conversation.state?.family_history || "");
        }
        if (data.documents) {
          setDocuments(data.documents);
        }
        if (data.ayush) {
          setAyushData(data.ayush);
        }
        if (data.patient?.name) {
          setPatientName(data.patient.name);
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSummaryData();
  }, [patientId]);

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      if (conversation?.id) {
        // Update the conversations table in Supabase directly
        const { error } = await supabase
          .from("conversations")
          .update({
            chief_complaint: editedChiefComplaint,
            state: {
              ...conversation.state,
              past_history: editedPastHistory,
              drug_allergy_history: editedDrugAllergy,
              family_history: editedFamilyHistory,
              doctor_notes: doctorNotes,
            }
          })
          .eq("id", conversation.id);

        if (error) throw error;

        setSaved(true);
        setIsEditing(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save edits to Supabase:", err);
      alert("Failed to save. Ensure RLS policies are applied in Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  // Load doctor notes if previously saved
  useEffect(() => {
    if (conversation?.state?.doctor_notes) {
      setDoctorNotes(conversation.state.doctor_notes);
    }
  }, [conversation]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
        <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block border border-red-100">
          {error}
        </div>
      </div>
    );
  }

  const allEntities = documents.flatMap(doc => doc.extracted_entities || []);
  const diagnoses = allEntities.filter(e => e.entity_type === "diagnosis");
  const medications = allEntities.filter(e => e.entity_type === "medication");
  const investigations = allEntities.filter(e => e.entity_type === "lab_value");
  const procedures = allEntities.filter(e => e.entity_type === "procedure");

  const hasData = conversation?.chief_complaint || allEntities.length > 0 || ayushData;

  if (!hasData) {
    return (
      <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
        <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinical Summary</h1>
        <div className="bg-gray-50 rounded-2xl p-10 border border-gray-200 flex flex-col items-center mt-8">
          <ClipboardCheck size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium max-w-xs">
            The patient has not yet completed their history-taking or document upload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 font-sans">
      <div className="flex items-center justify-between mb-6">
        <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <Edit3 size={16} /> Edit Summary
            </button>
          ) : (
            <button
              onClick={handleSaveEdits}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved ? "bg-emerald-100 text-emerald-700" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              <Save size={16} /> {saved ? "Saved!" : isSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          Clinical Summary — {patientName || "Patient"}
        </h1>
        <p className="text-gray-500 mt-1">Physician-editable overview of the patient&apos;s medical history.</p>
      </div>

      {conversation?.red_flag && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-8 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-800 font-bold mb-1">Priority Triage Flagged</h3>
              <ul className="text-sm text-red-700 list-disc pl-4 space-y-1">
                {conversation.red_flag_reasons?.map((reason: string, i: number) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR NOTES */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
            <Edit3 size={20} />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Doctor&apos;s Notes</h2>
        </div>
        <div className="p-6">
          <textarea
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="Add your clinical notes, observations, and recommendations here..."
            className="w-full min-h-[100px] p-3 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400 resize-y"
          />
        </div>
      </div>

      {/* CONVERSATION HISTORY SECTION */}
      {conversation && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="bg-sky-50/50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
              <Stethoscope size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Presenting History</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chief Complaint</h3>
              {isEditing ? (
                <textarea
                  value={editedChiefComplaint}
                  onChange={(e) => setEditedChiefComplaint(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-sky-400 resize-y"
                />
              ) : (
                <p className="text-gray-800 font-medium text-lg">
                  {editedChiefComplaint || conversation.chief_complaint || "Not recorded"}
                </p>
              )}
            </div>

            {conversation.state?.hpi && Object.keys(conversation.state.hpi).length > 0 && (
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">History of Present Illness (HPI)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(conversation.state.hpi).map(([field, value]) => (
                    value ? (
                      <div key={field} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="block text-xs font-semibold text-gray-500 capitalize mb-1">
                          {field.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-800 text-sm block">{value as string}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Past History</h3>
                {isEditing ? (
                  <textarea value={editedPastHistory} onChange={(e) => setEditedPastHistory(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-sky-400 resize-y" />
                ) : (
                  <p className="text-gray-700 text-sm">{editedPastHistory || conversation.state?.past_history || "None"}</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Drug/Allergy</h3>
                {isEditing ? (
                  <textarea value={editedDrugAllergy} onChange={(e) => setEditedDrugAllergy(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-sky-400 resize-y" />
                ) : (
                  <p className="text-gray-700 text-sm">{editedDrugAllergy || conversation.state?.drug_allergy_history || "None"}</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Family History</h3>
                {isEditing ? (
                  <textarea value={editedFamilyHistory} onChange={(e) => setEditedFamilyHistory(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-sky-400 resize-y" />
                ) : (
                  <p className="text-gray-700 text-sm">{editedFamilyHistory || conversation.state?.family_history || "None"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AYUSH SECTION */}
      {ayushData && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="bg-emerald-50/50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Leaf size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Ayurvedic Assessment (Prakriti)</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dominant Dosha</h3>
                <p className="text-gray-800 font-bold text-2xl capitalize text-emerald-600">
                  {ayushData.dominant_prakriti}
                </p>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm font-semibold text-gray-600">Vata: {ayushData.prakriti_scores?.vata || 0}</span>
                  <span className="text-sm font-semibold text-gray-600">Pitta: {ayushData.prakriti_scores?.pitta || 0}</span>
                  <span className="text-sm font-semibold text-gray-600">Kapha: {ayushData.prakriti_scores?.kapha || 0}</span>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vitals & Measurements</h3>
                <div className="flex gap-6">
                  <div>
                    <span className="block text-xs text-gray-500">BMI</span>
                    <span className="font-semibold text-gray-800">{ayushData.bmi || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Age Stage (Vaya)</span>
                    <span className="font-semibold text-gray-800 capitalize">{ayushData.vaya_category}</span>
                  </div>
                </div>
              </div>
            </div>

            {ayushData.pending_physical_exam_fields && ayushData.pending_physical_exam_fields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-amber-800 mb-1">Patient-reported, pending physical exam</h3>
                <p className="text-xs text-amber-700">The following parameters require doctor confirmation: <span className="font-medium capitalize">{ayushData.pending_physical_exam_fields.join(", ").replace(/_/g, " ")}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENT EXTRACTIONS */}
      {allEntities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-purple-50/50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Document Extractions</h2>
          </div>

          <div className="p-6 space-y-8">
            {diagnoses.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-indigo-500" /> Diagnoses Found
                </h3>
                <div className="flex flex-wrap gap-2">
                  {diagnoses.map((d, i) => (
                    <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full text-sm font-medium">
                      {d.value || d.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {medications.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Pill size={16} className="text-teal-500" /> Medications Found
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {medications.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-teal-50/30 border border-teal-100 p-3 rounded-xl">
                      <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                      {m.value && <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2 py-1 rounded-md font-medium">{m.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {procedures.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-rose-500" /> Procedures Found
                </h3>
                <div className="flex flex-wrap gap-2">
                  {procedures.map((p, i) => (
                    <span key={i} className="bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-full text-sm font-medium">
                      {p.label} {p.value ? `(${p.value})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {investigations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-amber-500" /> Lab Results
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Test Name</th>
                        <th className="px-4 py-3">Value</th>
                        <th className="px-4 py-3">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {investigations.map((inv, i) => (
                        <tr key={i} className={inv.is_abnormal ? "bg-red-50/50" : ""}>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {inv.label}
                            {inv.is_abnormal && <span className="ml-2 inline-flex text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Abnormal</span>}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${inv.is_abnormal ? 'text-red-600' : 'text-gray-700'}`}>
                            {inv.value} {inv.unit}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{inv.ref_range || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
