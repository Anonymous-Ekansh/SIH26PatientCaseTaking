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
    const supabase = createClient();
    async function fetchRole() {
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
