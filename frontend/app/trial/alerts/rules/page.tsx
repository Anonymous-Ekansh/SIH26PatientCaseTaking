"use client";
import React, { useEffect, useState } from "react";
import { RoleGate } from "../../../lib/trial/useRole";
import { Settings, Save, AlertCircle } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

export default function AlertRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRules = async () => {
    try {
      const { data } = await supabase.from('ct_alert_rules').select('*').order('name');
      if (data) setRules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleUpdate = async (id: string, field: string, value: any) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setSaving(id);
    try {
      await supabase.from('ct_alert_rules').update({ [field]: value }).eq('id', id);
    } catch (e) {
      console.error(e);
      // Revert on error
      fetchRules();
    } finally {
      setSaving(null);
    }
  };

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings size={24} className="text-slate-500" /> Alert Rules Configuration
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure thresholds and severities for system-generated alerts. (Admin Only)</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading rules...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-bold text-slate-700">Rule Name</th>
                  <th className="px-6 py-4 font-bold text-slate-700">Description</th>
                  <th className="px-6 py-4 font-bold text-slate-700 w-32">Threshold</th>
                  <th className="px-6 py-4 font-bold text-slate-700 w-40">Severity</th>
                  <th className="px-6 py-4 font-bold text-slate-700 w-24">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-700 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{rule.name}</td>
                    <td className="px-6 py-4 text-slate-600">{rule.description}</td>
                    <td className="px-6 py-4">
                      {rule.threshold !== null ? (
                        <input 
                          type="number" 
                          value={rule.threshold}
                          onChange={(e) => handleUpdate(rule.id, 'threshold', parseFloat(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={rule.severity}
                        onChange={(e) => handleUpdate(rule.id, 'severity', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={rule.enabled}
                          onChange={(e) => handleUpdate(rule.id, 'enabled', e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {saving === rule.id && <Save size={16} className="text-slate-400 animate-pulse" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
