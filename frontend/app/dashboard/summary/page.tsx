"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { 
  ClipboardCheck, 
  FileText, 
  Stethoscope, 
  Activity, 
  Pill, 
  AlertTriangle 
} from "lucide-react";

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [conversation, setConversation] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const supabase = createClient();
  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchSummaryData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // 1. Fetch internal patient
        const { data: patientData, error: patientError } = await supabase
          .table("patients")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (patientError || !patientData) {
          throw new Error("Patient profile not found.");
        }

        // 2. Fetch active encounter
        const { data: encounterData, error: encounterError } = await supabase
          .table("encounters")
          .select("id")
          .eq("patient_id", patientData.id)
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (encounterError || !encounterData) {
          throw new Error("No active encounter found. Please start a conversation first.");
        }

        const encounterId = encounterData.id;

        // 3. Fetch conversation state for this encounter
        const { data: convoData } = await supabase
          .table("conversations")
          .select("*")
          .eq("encounter_id", encounterId)
          .single();
          
        if (convoData) {
          setConversation(convoData);
        }

        // 4. Fetch documents and entities via backend API
        const res = await fetch(`${getApiUrl()}/api/documents/by-patient/${user.id}`);
        if (res.ok) {
          const docs = await res.json();
          setDocuments(docs);
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSummaryData();
  }, []);

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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block border border-red-100">
          {error}
        </div>
      </div>
    );
  }

  // Aggregate all extracted entities from all documents
  const allEntities = documents.flatMap(doc => doc.extracted_entities || []);

  const diagnoses = allEntities.filter(e => e.entity_type === "Diagnosis");
  const medications = allEntities.filter(e => e.entity_type === "Medication");
  const investigations = allEntities.filter(e => e.entity_type === "Investigation");

  const hasData = conversation?.chief_complaint || allEntities.length > 0;

  if (!hasData) {
    return (
      <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Clinical Summary</h1>
        <div className="bg-gray-50 rounded-2xl p-10 border border-gray-200 flex flex-col items-center mt-8">
          <ClipboardCheck size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium max-w-xs">
            Your summary will appear here once your conversation and documents are processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Clinical Summary</h1>
        <p className="text-gray-500 mt-1">A structured overview of your medical history and uploaded records.</p>
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
              <p className="text-gray-800 font-medium text-lg">
                {conversation.chief_complaint || "Not recorded"}
              </p>
              {conversation.complaint_category && (
                <span className="inline-block mt-2 text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                  Category: {conversation.complaint_category}
                </span>
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
                <p className="text-gray-700 text-sm">{conversation.state?.past_history || "None"}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Drug/Allergy</h3>
                <p className="text-gray-700 text-sm">{conversation.state?.drug_allergy_history || "None"}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Family History</h3>
                <p className="text-gray-700 text-sm">{conversation.state?.family_history || "None"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT EXTRACTIONS SECTION */}
      {allEntities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-purple-50/50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Document Extractions</h2>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Diagnoses */}
            {diagnoses.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-indigo-500" />
                  Diagnoses Found
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

            {/* Medications */}
            {medications.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Pill size={16} className="text-teal-500" />
                  Medications Found
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

            {/* Investigations */}
            {investigations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-amber-500" />
                  Lab Results
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
