"use client";
import React, { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, Clock, Filter, AlertTriangle, Activity } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function AlertsCentre() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [runningChecks, setRunningChecks] = useState(false);
  const supabase = createClient();

  const fetchAlerts = async () => {
    try {
      const { data } = await supabase
        .from('ct_alerts')
        .select(`
          *,
          ct_alert_rules (name, severity),
          ct_studies (short_code, title)
        `)
        .order('created_at', { ascending: false });
      
      if (data) setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const intv = setInterval(fetchAlerts, 15000);
    return () => clearInterval(intv);
  }, []);

  const runChecks = async () => {
    setRunningChecks(true);
    try {
      await fetch('http://localhost:8000/api/ct/alerts/run', { method: 'POST' });
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningChecks(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await supabase.from('ct_alerts').update({ status: newStatus }).eq('id', id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSev = severityFilter === 'all' || a.ct_alert_rules?.severity === severityFilter;
    return matchesStatus && matchesSev;
  });

  const getSeverityColor = (sev: string) => {
    if (sev === 'critical') return 'text-red-600 bg-red-100 border-red-200';
    if (sev === 'warning') return 'text-amber-600 bg-amber-100 border-amber-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Alerts Centre
          </h1>
          <p className="text-slate-500 text-sm">Monitor and resolve system-generated trial alerts.</p>
        </div>
        
        <button 
          onClick={runChecks}
          disabled={runningChecks}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-bold disabled:opacity-50"
        >
          {runningChecks ? <Activity size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
          {runningChecks ? "Running..." : "Run Checks Now"}
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="ack">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="relative w-48">
          <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading alerts...</div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              No alerts match the selected filters.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div key={alert.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${getSeverityColor(alert.ct_alert_rules?.severity)}`}>
                      {alert.ct_alert_rules?.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">{alert.ct_studies?.short_code || 'GLOBAL'}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12}/> {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{alert.ct_alert_rules?.name || 'System Alert'}</h3>
                  <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {alert.status === 'open' && (
                    <button 
                      onClick={() => updateStatus(alert.id, 'ack')}
                      className="px-4 py-2 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'open' || alert.status === 'ack') && (
                    <button 
                      onClick={() => updateStatus(alert.id, 'resolved')}
                      className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 size={16} /> Resolve
                    </button>
                  )}
                  {alert.status === 'resolved' && (
                    <span className="px-4 py-2 text-sm font-bold text-slate-400 bg-slate-50 rounded-lg">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
