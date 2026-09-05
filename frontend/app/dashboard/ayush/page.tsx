import { Leaf } from "lucide-react";

export default function AyushPage() {
  return (
    <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">AYUSH mode</h1>
      <p className="text-[#6B7280] mb-10">
        Traditional medicine history-taking for Ayurveda, Yoga, Unani, Siddha, and Homeopathy
      </p>

      <div className="bg-[#F5F5F5] rounded-2xl p-10 border border-[#E5E7EB] flex flex-col items-center justify-center">
        <Leaf size={48} className="text-[#E5E7EB] mb-4" />
        <p className="text-[#6B7280] font-medium">Coming soon</p>
      </div>
    </div>
  );
}
