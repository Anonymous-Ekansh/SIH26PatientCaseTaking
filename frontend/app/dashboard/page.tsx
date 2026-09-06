"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  MessageSquare,
  FileText,
  ClipboardCheck,
  Leaf,
  Calendar,
  LogOut,
  UserCircle,
  Settings,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/onboarding/signin");
        return;
      }
      setUserEmail(user.email || "");

      const { data: pat } = await supabase
        .from("patients")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (pat) {
        setPatient(pat);
      } else {
        // No patient profile — redirect to complete onboarding
        router.push("/onboarding/details");
      }
    }
    loadProfile();
  }, [supabase, router]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 py-10">
      {/* Header with Profile */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">
          Welcome{patient?.name ? `, ${patient.name}` : ""}
        </h1>

        {/* Profile Icon */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center hover:bg-sky-200 transition-colors"
          >
            <UserCircle size={24} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{patient?.name || "Patient"}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                {patient?.phone && (
                  <p className="text-xs text-gray-500">{patient.phone}</p>
                )}
              </div>
              <button
                onClick={() => { setProfileOpen(false); router.push("/dashboard/profile"); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Settings size={16} /> Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-100"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

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
