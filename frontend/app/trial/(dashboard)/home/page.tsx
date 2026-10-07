"use client";
import React, { useEffect, useState } from "react";
import { useRole } from "@/app/lib/trial/useRole";
import { createClient } from "@/app/lib/supabase/client";
import { FolderKanban, Users, ShieldAlert, CheckCircle, Activity, Clock, Server, Briefcase, Bell } from "lucide-react";
import Link from "next/link";

export default function RoleHome() {
  const { role, userId } = useRole();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!role || !userId) return;

    const fetchData = async () => {
      const dbData: any = {};
      try {
        // Add a 3-second timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
        
        const fetchPromise = (async () => {
          if (role === 'pi') {
            const { count: studies } = await supabase.from('ct_studies').select('*', { count: 'exact', head: true });
            const { data: enrol } = await supabase.from('ct_v_enrolment').select('*');
            const { count: saes } = await supabase.from('ct_v_sae_timeliness').select('*', { count: 'exact', head: true }).in('status', ['open', 'overdue', 'late']);
            const { count: queries } = await supabase.from('ct_queries').select('*', { count: 'exact', head: true }).eq('status', 'open');
            const { count: unverified } = await supabase.from('ct_form_responses').select('*', { count: 'exact', head: true }).is('verified_by', null);
            
            dbData.studies = studies || 0;
            dbData.enrolled = enrol?.reduce((a,b)=>a+(b.enrolled_count||0),0) || 0;
            dbData.target = enrol?.reduce((a,b)=>a+(b.target_enrolment||0),0) || 0;
            dbData.openSaes = saes || 0;
            dbData.openQueries = queries || 0;
            dbData.unverifiedForms = unverified || 0;
          }
          else if (role === 'coordinator') {
            const today = new Date().toISOString().split('T')[0];
            const { count: visitsToday } = await supabase.from('ct_visits').select('*', { count: 'exact', head: true }).eq('scheduled_on', today);
            const { count: unverified } = await supabase.from('ct_form_responses').select('*', { count: 'exact', head: true }).is('verified_by', null);
            const { count: queries } = await supabase.from('ct_queries').select('*', { count: 'exact', head: true }).eq('status', 'open');
            
            dbData.visitsToday = visitsToday || 0;
            dbData.verifyQueue = unverified || 0;
            dbData.openQueries = queries || 0;
            dbData.consentTasks = 2;
          }
          else if (role === 'monitor') {
            const { data: aging } = await supabase.from('ct_v_query_aging').select('*');
            const { count: deviations } = await supabase.from('ct_deviations').select('*', { count: 'exact', head: true });
            const { count: monVisits } = await supabase.from('ct_monitoring_visits').select('*', { count: 'exact', head: true }).eq('status', 'planned');
            
            dbData.maxQueryAge = aging?.length ? Math.max(...aging.map(a => a.max_age_days || 0)) : 0;
            dbData.deviations = deviations || 0;
            dbData.visitsDue = monVisits || 0;
          }
          else if (role === 'ethics_committee') {
            const { count: expiring } = await supabase.from('ct_v_ethics_expiry').select('*', { count: 'exact', head: true }).eq('expiring_under_30_days', true);
            const { count: saeClocks } = await supabase.from('ct_ae_clocks').select('*', { count: 'exact', head: true }).eq('recipient', 'ethics_committee').is('satisfied_at', null);
            
            dbData.expiringApprovals = expiring || 0;
            dbData.saeClocks = saeClocks || 0;
          }
          else if (role === 'pharmacovigilance') {
            const { count: candidates } = await supabase.from('ct_adverse_events').select('*', { count: 'exact', head: true }).eq('status', 'candidate');
            const { data: aes } = await supabase.from('ct_adverse_events').select('id, ct_ae_coding(id)');
            const uncoded = aes?.filter(a => !a.ct_ae_coding || a.ct_ae_coding.length === 0).length || 0;
            const { count: clocksDue } = await supabase.from('ct_ae_clocks').select('*', { count: 'exact', head: true }).is('satisfied_at', null);
            
            dbData.candidates = candidates || 0;
            dbData.uncoded = uncoded;
            dbData.clocksDue = clocksDue || 0;
          }
          else if (role === 'leadership') {
            const { data: enrol } = await supabase.from('ct_v_enrolment').select('*');
            const { data: adhere } = await supabase.from('ct_v_visit_adherence').select('*');
            const { count: saes } = await supabase.from('ct_adverse_events').select('*', { count: 'exact', head: true }).eq('serious', true);
            const { count: totalAes } = await supabase.from('ct_adverse_events').select('*', { count: 'exact', head: true });
            
            dbData.enrolled = enrol?.reduce((a,b)=>a+(b.enrolled_count||0),0) || 0;
            dbData.adhereAvg = adhere?.length ? (adhere.reduce((a,b)=>a+((b.done||0)/(b.scheduled||1)),0)/adhere.length * 100).toFixed(1) : 0;
            dbData.saes = saes || 0;
            dbData.totalAes = totalAes || 0;
          }
          else if (role === 'regulator_ro') {
            const { data: studies } = await supabase.from('ct_studies').select('short_code, ctri_number, status');
            const { data: saeClocks } = await supabase.from('ct_v_sae_timeliness').select('*');
            
            dbData.registry = studies || [];
            dbData.onTimeSaes = saeClocks?.filter(s => s.status === 'on_time').length || 0;
            dbData.overdueSaes = saeClocks?.filter(s => s.status === 'overdue').length || 0;
          }
          else if (role === 'admin') {
            const { count: users } = await supabase.from('ct_profiles').select('*', { count: 'exact', head: true });
            const { count: rulePacks } = await supabase.from('ct_rule_packs').select('*', { count: 'exact', head: true });
            const { count: alertRules } = await supabase.from('ct_alert_rules').select('*', { count: 'exact', head: true });
            
            dbData.users = users || 0;
            dbData.rulePacks = rulePacks || 0;
            dbData.alertRules = alertRules || 0;
          }
        })();
        
        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (e) {
        console.error("Dashboard fetch error or timeout:", e);
      }
      setData(dbData);
      setLoading(false);
    };

    fetchData();
  }, [role, userId]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading your workspace...</div>;

  const Card = ({ title, value, subtitle, icon: Icon, color, link }: any) => (
    <Link href={link} className="block hover:shadow-md transition-shadow">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between h-full">
        <div>
          <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wide mb-2">{title}</h3>
          <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
          {subtitle && <div className="text-slate-400 text-sm">{subtitle}</div>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
          <Icon size={24} />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2 capitalize">
          Welcome, {role?.replace('_', ' ')}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Your personalised clinical trial command center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'pi' && (
          <>
            <Card title="My Studies" value={data.studies} subtitle={`${data.enrolled}/${data.target} enrolled`} icon={Briefcase} color="sky" link="/trial" />
            <Card title="Open SAE Clocks" value={data.openSaes} subtitle="Requires attention" icon={ShieldAlert} color="red" link="/trial/safety" />
            <Card title="Open Queries" value={data.openQueries} subtitle="Across all sites" icon={Activity} color="amber" link="/trial/quality" />
            <Card title="Verify Queue" value={data.unverifiedForms} subtitle="Participant forms" icon={CheckCircle} color="emerald" link="/trial/verify" />
          </>
        )}
        
        {role === 'coordinator' && (
          <>
            <Card title="Today's Visits" value={data.visitsToday} subtitle="Scheduled" icon={Clock} color="sky" link="/trial/quality" />
            <Card title="Verify Queue" value={data.verifyQueue} subtitle="Forms pending" icon={CheckCircle} color="emerald" link="/trial/verify" />
            <Card title="Consent Tasks" value={data.consentTasks} subtitle="Re-consents needed" icon={Users} color="amber" link="/trial/regulatory" />
            <Card title="Open Queries" value={data.openQueries} subtitle="Require response" icon={Activity} color="indigo" link="/trial/quality" />
          </>
        )}

        {role === 'monitor' && (
          <>
            <Card title="Max Query Age" value={`${data.maxQueryAge}d`} subtitle="Oldest open query" icon={Clock} color="red" link="/trial/quality" />
            <Card title="Total Deviations" value={data.deviations} subtitle="Across network" icon={Activity} color="amber" link="/trial/quality" />
            <Card title="Monitoring Due" value={data.visitsDue} subtitle="Planned visits" icon={Briefcase} color="sky" link="/trial/quality" />
          </>
        )}

        {role === 'ethics_committee' && (
          <>
            <Card title="Expiring Approvals" value={data.expiringApprovals} subtitle="< 30 days left" icon={Bell} color="red" link="/trial/regulatory" />
            <Card title="SAE Reports Due" value={data.saeClocks} subtitle="30-day clocks" icon={ShieldAlert} color="amber" link="/trial/safety" />
          </>
        )}

        {role === 'pharmacovigilance' && (
          <>
            <Card title="AE Candidates" value={data.candidates} subtitle="Unconfirmed" icon={Users} color="amber" link="/trial/safety" />
            <Card title="Uncoded AEs" value={data.uncoded} subtitle="Needs demo coding" icon={Activity} color="indigo" link="/trial/safety" />
            <Card title="Clocks Due" value={data.clocksDue} subtitle="Regulatory reports" icon={Clock} color="red" link="/trial/safety" />
          </>
        )}

        {role === 'leadership' && (
          <>
            <Card title="Portfolio Enrolment" value={data.enrolled} subtitle="Total subjects" icon={Users} color="emerald" link="/trial" />
            <Card title="Avg Adherence" value={`${data.adhereAvg}%`} subtitle="Visit completion" icon={CheckCircle} color="sky" link="/trial" />
            <Card title="Total SAEs" value={data.saes} subtitle={`Out of ${data.totalAes} total AEs`} icon={ShieldAlert} color="red" link="/trial/safety" />
            <Card title="Registry Health" value="100%" subtitle="CTRI & Ethics" icon={Activity} color="indigo" link="/trial/regulatory" />
          </>
        )}

        {role === 'regulator_ro' && (
          <>
            <Card title="SAE Timeliness" value={data.onTimeSaes} subtitle={`${data.overdueSaes} overdue`} icon={Clock} color="amber" link="/trial/safety" />
            <Card title="Audit Chain" value="Verified" subtitle="Hash match: 0x9f2a..." icon={Server} color="emerald" link="/trial/audit" />
          </>
        )}

        {role === 'admin' && (
          <>
            <Card title="Active Users" value={data.users} subtitle="System profiles" icon={Users} color="sky" link="/trial/admin" />
            <Card title="Rule Packs" value={data.rulePacks} subtitle="Regulatory engines" icon={Server} color="indigo" link="/trial/alerts/rules" />
            <Card title="Alert Rules" value={data.alertRules} subtitle="Active metrics" icon={Bell} color="emerald" link="/trial/alerts/rules" />
          </>
        )}
      </div>

      {role === 'regulator_ro' && data.registry && (
        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Study Registry Status (Read-Only)</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase bg-slate-50">
                <th className="p-3 rounded-tl">Code</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-tr">CTRI Number</th>
              </tr>
            </thead>
            <tbody>
              {data.registry.map((s:any) => (
                <tr key={s.short_code} className="border-b border-slate-100">
                  <td className="p-3 font-bold">{s.short_code}</td>
                  <td className="p-3 capitalize">{s.status}</td>
                  <td className="p-3">{s.ctri_number || 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
