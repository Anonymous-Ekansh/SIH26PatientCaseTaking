"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type RoleContextType = {
  role: string | null;
  userId: string | null;
  loading: boolean;
};

const RoleContext = createContext<RoleContextType>({ role: null, userId: null, loading: true });

export function TrialRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchRole() {
      // Demo mode bypass: check if demo role is stored in localStorage
      const demoRole = typeof window !== 'undefined' ? localStorage.getItem('demo_role') : null;
      if (demoRole) {
        setRole(demoRole);
        setUserId('demo-user-123');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data } = await supabase.from('ct_profiles').select('role').eq('user_id', user.id).single();
        if (data) {
          setRole(data.role);
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  return <RoleContext.Provider value={{ role, userId, loading }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export function RoleGate({ allow, children }: { allow: string[], children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null;
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}
