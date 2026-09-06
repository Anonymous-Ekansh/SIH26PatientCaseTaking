"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function DoctorSummaryRedirect({ params }: { params: { encounterId: string } }) {
  const { encounterId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function resolve() {
      if (!encounterId || encounterId === "undefined") {
        setError("Invalid encounter ID. Please refresh your Doctor Dashboard and try again.");
        setLoading(false);
        return;
      }
      try {
        // Use the encounter-summary endpoint to find the patient_id
        const res = await fetch(`${getApiUrl()}/api/documents/encounter-summary/${encounterId}`);
        if (res.ok) {
          const data = await res.json();
          const pid = data.encounter?.patient_id;
          if (pid) {
            setPatientId(pid);
            window.location.href = `/doctor/patient/${pid}`;
            return;
          }
        }
        setError("Could not resolve this encounter. The patient may not have started their session yet.");
      } catch (err: any) {
        setError(err.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    }
    resolve();
  }, [encounterId]);

  if (loading || patientId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
      <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="bg-gray-50 rounded-2xl p-10 border border-gray-200 flex flex-col items-center mt-4">
        <ClipboardCheck size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium max-w-xs">
          {error || "The patient has not yet completed their history-taking."}
        </p>
      </div>
    </div>
  );
}
