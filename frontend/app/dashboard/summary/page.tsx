import { ClipboardCheck } from "lucide-react";

export default function SummaryPage() {
  return (
    <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Your summary</h1>
      <p className="text-[#6B7280] mb-10">
        A structured overview of your medical history for your doctor
      </p>

      <div className="bg-[#F5F5F5] rounded-2xl p-10 border border-[#E5E7EB] flex flex-col items-center justify-center">
        <ClipboardCheck size={48} className="text-[#E5E7EB] mb-4" />
        <p className="text-[#6B7280] font-medium max-w-xs">
          Your summary will appear here once your conversation and documents are
          processed.
        </p>
      </div>
    </div>
  );
}
