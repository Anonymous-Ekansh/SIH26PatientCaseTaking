"use client";
import React, { useEffect, useState } from "react";
import { RoleGate, useRole } from "@/app/lib/trial/useRole";
import { createClient } from "@/app/lib/supabase/client";
import { FileClock, Server, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight, Filter } from "lucide-react";

export default function AuditDesk() {
  const { role } = useRole();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Filters
  const [tableFilter, setTableFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  
  // Verification State
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const supabase = createClient();

  const fetchLogs = async () => {
    try {
      let query = supabase.from('ct_audit_log').select('*').order('id', { ascending: false }).limit(100);
      
      if (tableFilter) query = query.eq('table_name', tableFilter);
      if (actorFilter) query = query.ilike('actor_role', `%${actorFilter}%`);

      const { data } = await query;
      if (data) setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actorFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({...prev, [id]: !prev[id]}));
  };

  const verifyChain = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/ct/audit/verify`, { method: "POST" });
      const data = await res.json();
      if (data.status === 'success') {
        setVerifyResult(data.result[0]); // {ok, checked, first_broken_id}
      } else {
        alert("Verification API error: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to verify chain.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <RoleGate allow={['admin', 'regulator_ro']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <FileClock size={32} className="text-emerald-600" /> Audit Trail
            </h1>
            <p className="text-slate-500 text-sm mt-1">Immutable record of all system events and cryptographic chain verification.</p>
          </div>
          
          <button 
            onClick={verifyChain} 
            disabled={verifying}
            className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Server size={18} />
            {verifying ? "Verifying Hash Chain..." : "Verify Chain Cryptography"}
          </button>
        </div>

        {/* Verification Result Banner */}
        {verifyResult && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${verifyResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {verifyResult.ok ? <ShieldCheck size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
            <div>
              <h3 className="font-bold text-lg">{verifyResult.ok ? "Chain Intact" : "Chain Broken"}</h3>
              <p className="text-sm opacity-90 mt-1">
                {verifyResult.ok 
                  ? `Successfully verified ${verifyResult.checked} consecutive records. No tampering detected.`
                  : `Cryptographic mismatch detected. Chain broken at record ID ${verifyResult.first_broken_id}. Previous hashes do not align.`}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 items-center shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter by table name..." 
            value={tableFilter} 
            onChange={e => setTableFilter(e.target.value)}
            className="p-2 border rounded-lg text-sm flex-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
          />
          <input 
            type="text" 
            placeholder="Filter by actor role..." 
            value={actorFilter} 
            onChange={e => setActorFilter(e.target.value)}
            className="p-2 border rounded-lg text-sm flex-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
          />
        </div>

        {/* Log Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading audit trail...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Table</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3 text-right">Row Hash</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">No logs found matching criteria.</td></tr>
                ) : logs.map(log => {
                  const isExp = expanded[log.id];
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`border-b border-slate-100 hover:bg-slate-50 ${isExp ? 'bg-slate-50' : ''}`}>
                        <td className="p-3 text-center">
                          <button onClick={() => toggleExpand(log.id)} className="text-slate-400 hover:text-slate-700">
                            {isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td className="p-3 font-medium text-slate-500">#{log.id}</td>
                        <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-3 font-bold text-slate-700">{log.table_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>{log.action}</span>
                        </td>
                        <td className="p-3 text-xs">
                          {log.actor_role ? <span className="font-bold text-slate-700 uppercase bg-slate-100 px-1 py-0.5 rounded mr-1">{log.actor_role}</span> : null}
                          <span className="text-slate-400">{log.actor_id?.substring(0,8)}</span>
                        </td>
                        <td className="p-3 text-right text-xs font-mono text-slate-400 truncate max-w-[120px]" title={log.row_hash}>
                          {log.row_hash?.substring(0, 16)}...
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-slate-900 border-b border-slate-200">
                          <td colSpan={7} className="p-0">
                            <div className="grid grid-cols-2 p-6 gap-6">
                              <div>
                                <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Old Data</h4>
                                <pre className="bg-slate-800 text-slate-300 p-4 rounded border border-slate-700 text-[10px] overflow-auto max-h-60">
                                  {log.old_data ? JSON.stringify(log.old_data, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">New Data</h4>
                                <pre className="bg-slate-800 text-emerald-400 p-4 rounded border border-slate-700 text-[10px] overflow-auto max-h-60">
                                  {log.new_data ? JSON.stringify(log.new_data, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                            <div className="px-6 pb-6 text-[10px] text-slate-500 font-mono">
                              <div><span className="text-slate-400">Prev Hash:</span> {log.prev_hash}</div>
                              <div><span className="text-slate-400">Row Hash:</span> {log.row_hash}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
