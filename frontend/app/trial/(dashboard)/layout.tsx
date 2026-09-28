import Link from "next/link";
import { 
  FolderKanban, 
  BellRing, 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  FileCheck, 
  FileClock, 
  Download, 
  Stamp 
} from "lucide-react";

export default function TrialDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { name: "Portfolio", href: "/trial", icon: FolderKanban },
    { name: "Alerts", href: "/trial/alerts", icon: BellRing },
    { name: "Participants", href: "/trial/participants", icon: Users },
    { name: "Safety", href: "/trial/safety", icon: ShieldAlert },
    { name: "Quality", href: "/trial/quality", icon: CheckCircle },
    { name: "Regulatory", href: "/trial/regulatory", icon: FileCheck },
    { name: "Audit", href: "/trial/audit", icon: FileClock },
    { name: "Exports", href: "/trial/exports", icon: Download },
    { name: "Conformance", href: "/trial/conformance", icon: Stamp },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-xl text-white tracking-tight">
              Trial<span className="text-sky-400">Saathi</span>
            </span>
          </div>
          <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
            Role: <span className="text-sky-400 ml-1">Principal Investigator</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
