"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Users, ShieldAlert, FileCheck, Stethoscope } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function StudyDetail({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: study },
          { data: milestones },
          { data: participants },
          { data: adherence },
          { data: queries },
          { data: deviations },
          { data: aeSummary },
          { data: ethics }
        ] = await Promise.all([
          supabase.from('ct_studies').select('*').eq('id', params.id).single(),
          supabase.from('ct_milestones').select('*').eq('study_id', params.id),
          supabase.from('ct_participants').select('status').eq('study_id', params.id),
          supabase.from('ct_v_visit_adherence').select('*').eq('study_id', params.id),
          supabase.from('ct_v_query_aging').select('*').eq('study_id', params.id).maybeSingle(),
          supabase.from('ct_v_deviations').select('*').eq('study_id', params.id).maybeSingle(),
          supabase.from('ct_v_ae_summary').select('*').eq('study_id', params.id),
          supabase.from('ct_ethics_approvals').select('*').eq('study_id', params.id)
        ]);

        // Aggregate visits
        const totalVisits = adherence?.reduce((acc: any, curr: any) => ({
          scheduled: acc.scheduled + curr.scheduled,
          done: acc.done + curr.done,
          missed: acc.missed + curr.missed,
          overdue: acc.overdue + curr.overdue
        }), { scheduled: 0, done: 0, missed: 0, overdue: 0 }) || { scheduled: 0, done: 0, missed: 0, overdue: 0 };

        setData({
          study,
          milestones: milestones || [],
          participants: participants || [],
          adherence: totalVisits,
          queries: queries || { open_queries: 0, median_age_days: 0 },
          deviations: deviations || { deviation_count: 0, deviations_per_100_visits: 0 },
          aeSummary: aeSummary || [],
          ethics: ethics || []
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading || !data) return <div className="p-12 text-center text-slate-500">Loading study details...</div>;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sites", label: "Sites" },
    { id: "participants", label: "Participants" },
    { id: "visits", label: "Visits" },
    { id: "quality", label: "Quality" },
    { id: "safety", label: "Safety" },
    { id: "regulatory", label: "Regulatory" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/trial" className="inline-flex items-center text-sm font-medium text-sky-600 hover:underline">
        <ArrowLeft size={16} className="mr-1" /> Back to Portfolio
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{data.study.short_code}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 uppercase">
                {data.study.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{data.study.title}</h1>
          </div>
          <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800">
            Edit Details
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar mt-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-sky-500 text-sky-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
        {activeTab === "overview" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-sky-500"/> Study Milestones</h3>
            <div className="space-y-4">
              {data.milestones.map((m: any) => (
                <div key={m.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 capitalize">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-slate-500 flex gap-4 mt-1">
                      <span>Planned: <span className="font-medium text-slate-700">{m.planned_date}</span></span>
                      <span>Actual: <span className="font-medium text-slate-700">{m.actual_date || 'Pending'}</span></span>
                    </div>
                  </div>
                </div>
              ))}
              {data.milestones.length === 0 && <p className="text-slate-500 text-sm">No milestones recorded.</p>}
            </div>
          </div>
        )}

        {activeTab === "participants" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Users size={20} className="text-sky-500"/> Enrolment Breakdown</h3>
            <div className="flex items-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-black text-slate-800">{data.participants.length}</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Total Enrolled</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-sky-500">{data.study.target_enrolment}</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Target</div>
              </div>
            </div>
            
            <div className="w-full max-w-xl">
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span>Progress</span>
                <span>{Math.round((data.participants.length / (data.study.target_enrolment || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-sky-500 h-4 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (data.participants.length / (data.study.target_enrolment || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "visits" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Stethoscope size={20} className="text-sky-500"/> Visit Adherence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-3xl font-black text-slate-800">{data.adherence.scheduled}</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Scheduled</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <div className="text-3xl font-black text-emerald-600">{data.adherence.done}</div>
                <div className="text-xs font-bold text-emerald-600 uppercase mt-1">Completed</div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                <div className="text-3xl font-black text-red-600">{data.adherence.missed}</div>
                <div className="text-xs font-bold text-red-600 uppercase mt-1">Missed</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <div className="text-3xl font-black text-amber-600">{data.adherence.overdue}</div>
                <div className="text-xs font-bold text-amber-600 uppercase mt-1">Overdue</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "quality" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertCircle size={20} className="text-amber-500"/> Data Quality Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Query Aging</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Open Queries</span>
                    <span className="font-bold text-slate-900">{data.queries.open_queries}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Median Age</span>
                    <span className="font-bold text-amber-600">{data.queries.median_age_days || 0} days</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Protocol Deviations</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Total Deviations</span>
                    <span className="font-bold text-slate-900">{data.deviations.deviation_count}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Per 100 Visits</span>
                    <span className="font-bold text-amber-600">{parseFloat(data.deviations.deviations_per_100_visits).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "safety" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ShieldAlert size={20} className="text-red-500"/> Safety Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <th className="px-4 py-3 font-bold rounded-tl-lg">System Organ Class (SOC)</th>
                    <th className="px-4 py-3 font-bold">Severity</th>
                    <th className="px-4 py-3 font-bold">Serious</th>
                    <th className="px-4 py-3 font-bold rounded-tr-lg">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.aeSummary.map((ae: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{ae.soc || 'Uncoded'}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{ae.severity}</td>
                      <td className="px-4 py-3">
                        {ae.serious ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">Yes</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{ae.ae_count}</td>
                    </tr>
                  ))}
                  {data.aeSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No adverse events recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "regulatory" && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileCheck size={20} className="text-sky-500"/> Regulatory Status</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">CTRI Registration</h4>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 inline-block w-full max-w-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-sm">CTRI Number</span>
                    <span className="font-bold text-slate-900">{data.study.ctri_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Next Update Due</span>
                    <span className="font-medium text-slate-700">{data.study.ctri_update_due || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Ethics Approvals</h4>
                <div className="space-y-3">
                  {data.ethics.map((e: any) => (
                    <div key={e.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center max-w-2xl">
                      <div>
                        <div className="font-bold text-slate-800">{e.committee_name}</div>
                        <div className="text-sm text-slate-500 mt-1">Approved: {e.approval_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-700 mb-1">Valid Until</div>
                        <div className="font-bold text-amber-600">{e.valid_until}</div>
                      </div>
                    </div>
                  ))}
                  {data.ethics.length === 0 && <p className="text-sm text-slate-500">No ethics approvals recorded.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholders for sites and audit */}
        {["sites", "audit"].includes(activeTab) && (
          <div className="flex items-center justify-center h-48 text-slate-400">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} data integration pending.
          </div>
        )}
      </div>
    </div>
  );
}
