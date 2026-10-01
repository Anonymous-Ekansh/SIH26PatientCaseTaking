"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, Download, Activity, Clock, ShieldAlert, BarChart3 } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

export default function TrialPortfolio() {
  const [studies, setStudies] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const supabase = createClient();

  const fetchPortfolio = async () => {
    try {
      const [
        { data: stData },
        { data: enData },
        { data: ethData },
        { data: ctriData },
        { data: qData },
        { data: saeData },
        { data: sitesData },
        { data: adhData },
        { data: devData }
      ] = await Promise.all([
        supabase.from('ct_studies').select('id, title, status, short_code'),
        supabase.from('ct_v_enrolment').select('*'),
        supabase.from('ct_v_ethics_expiry').select('*'),
        supabase.from('ct_v_ctri').select('*'),
        supabase.from('ct_v_query_aging').select('*'),
        supabase.from('ct_v_sae_timeliness').select('*'),
        supabase.from('ct_study_sites').select('study_id'),
        supabase.from('ct_v_visit_adherence').select('*'),
        supabase.from('ct_v_deviations').select('*')
      ]);

      if (!stData) return;

      const combined = stData.map((study: any) => {
        const enrol = enData?.find((e: any) => e.study_id === study.id) || {};
        const ethics = ethData?.find((e: any) => e.study_id === study.id) || {};
        const ctri = ctriData?.find((c: any) => c.study_id === study.id) || {};
        const query = qData?.find((q: any) => q.study_id === study.id) || {};
        const saes = saeData?.filter((s: any) => s.study_id === study.id) || [];
        const siteCount = sitesData?.filter((s: any) => s.study_id === study.id).length || 0;

        const overdueSaes = saes.filter((s: any) => s.status === 'overdue').length;
        const openSaes = saes.filter((s: any) => s.status === 'open' || s.status === 'late' || s.status === 'overdue').length;
        const ethicsDaysLeft = ethics.days_to_valid_until !== undefined ? ethics.days_to_valid_until : null;
        
        let health = 'green';
        if (overdueSaes > 0 || (ethicsDaysLeft !== null && ethicsDaysLeft < 0)) {
          health = 'red';
        } else if (enrol.lag_flag === true || (ethicsDaysLeft !== null && ethicsDaysLeft < 30)) {
          health = 'amber';
        }

        return {
          ...study,
          target_enrolment: enrol.target_enrolment || 0,
          enrolled_count: enrol.enrolled_count || 0,
          enrolled_percent: enrol.enrolled_percent || 0,
          ethics_days_left: ethicsDaysLeft,
          ctri_days_left: ctri.days_left !== undefined ? ctri.days_left : null,
          open_queries: query.open_queries || 0,
          open_saes: openSaes,
          overdue_saes: overdueSaes,
          site_count: siteCount,
          health
        };
      });

      setStudies(combined);

      // Compute Overall KPIs
      const totTarget = (enData || []).reduce((sum, e) => sum + (e.target_enrolment || 0), 0);
      const totEnrolled = (enData || []).reduce((sum, e) => sum + (e.enrolled_count || 0), 0);
      const enrolPct = totTarget > 0 ? ((totEnrolled / totTarget) * 100).toFixed(1) : 0;

      const totSch = (adhData || []).reduce((sum, a) => sum + (a.scheduled || 0), 0);
      const totDone = (adhData || []).reduce((sum, a) => sum + (a.done || 0), 0);
      const adherePct = totSch > 0 ? ((totDone / totSch) * 100).toFixed(1) : 0;

      const totQueries = (qData || []).reduce((sum, q) => sum + (q.open_queries || 0), 0);
      
      const totDevs = (devData || []).reduce((sum, d) => sum + (d.deviation_count || 0), 0);
      const devPer100 = totSch > 0 ? ((totDevs / totSch) * 100).toFixed(2) : 0;

      const totSaeClocks = saeData?.length || 0;
      const onTimeSae = (saeData || []).filter(s => s.status === 'on_time').length;
      const saePct = totSaeClocks > 0 ? ((onTimeSae / totSaeClocks) * 100).toFixed(1) : 100;

      const ethExp = (ethData || []).filter(e => e.expiring_under_30_days || e.days_to_valid_until < 0).length;

      setKpis({
        enrolPct,
        adherePct,
        totQueries,
        devPer100,
        saePct,
        ethExp
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerAlertsRun = async () => {
    const lastRun = localStorage.getItem('last_alert_run');
    const now = Date.now();
    if (!lastRun || now - parseInt(lastRun) > 5 * 60 * 1000) {
      try {
        await fetch('http://localhost:8000/api/ct/alerts/run', { method: 'POST' });
        localStorage.setItem('last_alert_run', now.toString());
      } catch (e) {
        console.error("Alert run failed", e);
      }
    }
  };

  useEffect(() => {
    triggerAlertsRun();
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredStudies = studies.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.short_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCsv = () => {
    if (!filteredStudies.length) return;
    const headers = ['Short Code', 'Title', 'Status', 'Health', 'Enrolled', 'Target', 'Sites', 'Open Queries', 'Open SAEs', 'Ethics Days Left'];
    const rows = filteredStudies.map(s => [
      s.short_code, `"${s.title}"`, s.status, s.health, s.enrolled_count, s.target_enrolment, s.site_count, s.open_queries, s.open_saes, s.ethics_days_left
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trialsaathi_portfolio.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Study Portfolio
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              LIVE
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Real-time overview of all active clinical trials.</p>
        </div>
        
        <button 
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">Enrolment</div>
            <div className="text-2xl font-black text-sky-600">{kpis.enrolPct}%</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">Adherence</div>
            <div className="text-2xl font-black text-emerald-600">{kpis.adherePct}%</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">Open Queries</div>
            <div className="text-2xl font-black text-slate-800">{kpis.totQueries}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">Dev/100 Visits</div>
            <div className="text-2xl font-black text-amber-600">{kpis.devPer100}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">SAE On-Time</div>
            <div className="text-2xl font-black text-indigo-600">{kpis.saePct}%</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold text-slate-500 uppercase">Ethics Risk</div>
            <div className="text-2xl font-black text-red-600">{kpis.ethExp}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search trials by title or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading && studies.length === 0 ? (
        <div className="p-12 text-center text-slate-500">Loading portfolio data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map(study => (
            <Link href={`/trial/studies/${study.id}`} key={study.id} className="block">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col relative overflow-hidden group">
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  study.health === 'red' ? 'bg-red-500' : 
                  study.health === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'
                }`}></div>
                <div className="flex justify-between items-start mb-3 mt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{study.short_code}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">
                    {study.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-4 line-clamp-2 leading-tight group-hover:text-sky-600 transition-colors">
                  {study.title}
                </h3>
                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-500">
                      <span>Enrolment</span>
                      <span className="text-slate-900">{study.enrolled_count} / {study.target_enrolment}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, study.enrolled_percent)}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1"><Activity size={12} /> Sites</div>
                      <div className="font-bold text-slate-700">{study.site_count} Active</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1"><ShieldAlert size={12} /> Open SAEs</div>
                      <div className={`font-bold ${study.overdue_saes > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {study.open_saes} {study.overdue_saes > 0 && <span className="text-xs text-red-500">({study.overdue_saes} Overdue)</span>}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1"><Clock size={12} /> Ethics</div>
                      <div className={`font-bold ${study.ethics_days_left !== null && study.ethics_days_left < 30 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {study.ethics_days_left !== null ? `${study.ethics_days_left}d left` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1"><Clock size={12} /> CTRI</div>
                      <div className="font-bold text-slate-700">{study.ctri_days_left !== null ? `${study.ctri_days_left}d left` : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
