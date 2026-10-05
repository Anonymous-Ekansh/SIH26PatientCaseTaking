"use client";
import Link from "next/link";
import { 
  FolderKanban, BellRing, Users, ShieldAlert, CheckCircle, 
  FileCheck, FileClock, Download, Stamp, ListChecks, FlaskConical 
} from "lucide-react";
import { TrialRoleProvider, useRole } from "@/app/lib/trial/useRole";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Portfolio", href: "/trial", icon: FolderKanban, allow: ["pi", "coordinator", "monitor", "leadership", "admin"] },
  { name: "Alerts", href: "/trial/alerts", icon: BellRing, allow: ["pi", "coordinator", "monitor", "pharmacovigilance", "leadership", "admin"] },
  { name: "Participants", href: "/trial/participants", icon: Users, allow: ["pi", "coordinator", "admin"] },
  { name: "Safety", href: "/trial/safety", icon: ShieldAlert, allow: ["pi", "coordinator", "pharmacovigilance", "ethics_committee", "regulator_ro", "admin"] },
  { name: "Quality", href: "/trial/quality", icon: CheckCircle, allow: ["monitor", "admin"] },
  { name: "Regulatory", href: "/trial/regulatory", icon: FileCheck, allow: ["regulator_ro", "ethics_committee", "admin", "leadership"] },
  { name: "Audit", href: "/trial/audit", icon: FileClock, allow: ["admin", "regulator_ro"] },
  { name: "Exports", href: "/trial/exports", icon: Download, allow: ["pi", "coordinator", "admin", "leadership"] },
  { name: "Conformance", href: "/trial/conformance", icon: Stamp, allow: ["monitor", "regulator_ro", "admin"] },
  { name: "Verify Queue", href: "/trial/verify", icon: ListChecks, allow: ["pi", "coordinator", "monitor"] },
  { name: "Lab OCR", href: "/trial/labs", icon: FlaskConical, allow: ["pi", "coordinator", "monitor", "admin"] },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  const router = useRouter();
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    if (!loading && !role) {
       router.push('/trial/login');
    }
  }, [loading, role, router]);

  useEffect(() => {
    if (role) {
      const fetchAlerts = async () => {
        const { createClient } = await import('@/app/lib/supabase/client');
        const supabase = createClient();
        const { count } = await supabase.from('ct_alerts').select('*', { count: 'exact', head: true }).eq('status', 'open');
        if (count !== null) setOpenAlerts(count);
      };
      fetchAlerts();
      const intv = setInterval(fetchAlerts, 15000);
      return () => clearInterval(intv);
    }
  }, [role]);

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!role) return null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-xl text-white tracking-tight">
              Trial<span className="text-sky-400">Saathi</span>
            </span>
          </div>
          <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
            Role: <span className="text-sky-400 ml-1 capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.filter(item => item.allow.includes(role)).map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
          <Link href="/trial/alerts" className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors">
            <BellRing size={20} />
            {openAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                {openAlerts > 99 ? '99+' : openAlerts}
              </span>
            )}
          </Link>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function TrialDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrialRoleProvider>
      <DashboardContent>{children}</DashboardContent>
    </TrialRoleProvider>
  );
}
