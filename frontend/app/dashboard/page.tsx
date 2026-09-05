"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  MessageSquare,
  FileText,
  ClipboardCheck,
  Leaf,
  Calendar,
  LogOut
} from "lucide-react";

const SECTIONS = [
  {
    title: "Book Consultation",
    desc: "Choose a doctor and slot to begin.",
    icon: Calendar,
    href: "/dashboard/book",
  },
  {
    title: "Conversation",
    desc: "Answer health questions by voice or touch.",
    icon: MessageSquare,
    href: "/dashboard/conversation",
  },
  {
    title: "Documents",
    desc: "Upload prescriptions, reports, or summaries.",
    icon: FileText,
    href: "/dashboard/documents",
  },
  {
    title: "Summary",
    desc: "Review your compiled medical history.",
    icon: ClipboardCheck,
    href: "/dashboard/summary",
  },
  {
    title: "AYUSH mode",
    desc: "Traditional medicine history-taking.",
    icon: Leaf,
    href: "/dashboard/ayush",
  },
];

export default function DashboardHome() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 py-10">
      <div className="flex justify-end mb-4">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2 text-center">
        Welcome to MediKiosk
      </h1>
      <p className="text-[#6B7280] text-center mb-10">
        Choose a section to get started
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {SECTIONS.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="bg-[#F5F5F5] rounded-2xl p-6 border border-[#E5E7EB] hover:border-[#0EA5E9] transition-colors group active:scale-[0.98] flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#0EA5E9] flex-shrink-0 group-hover:bg-sky-50 transition-colors">
              <section.icon size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-[#1A1A1A] mb-1">{section.title}</h2>
              <p className="text-[#6B7280] text-sm">{section.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
