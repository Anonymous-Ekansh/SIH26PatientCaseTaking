"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from "react";
import { createClient } from "./supabase/client";

type Language = "en" | "hi";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

export function LanguageProvider({ 
  children, 
  initialLocale = "en" 
}: { 
  children: ReactNode; 
  initialLocale?: "en" | "hi" 
}) {
  const [language, setLanguageState] = useState<Language>(initialLocale);
  const supabase = createClient();

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    
    // Attempt to persist to Supabase if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("patients")
          .update({ preferred_language: lang })
          .eq("auth_user_id", user.id);
      }
    } catch (e) {
      console.error("Failed to save language preference", e);
    }
  };

  // Sync with Supabase on mount if available and cookie wasn't set explicitly yet
  useEffect(() => {
    async function syncLanguage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("patients")
          .select("preferred_language")
          .eq("auth_user_id", user.id)
          .single();
          
        if (data?.preferred_language && data.preferred_language !== language) {
          const lang = data.preferred_language as Language;
          setLanguageState(lang);
          document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
        }
      }
    }
    syncLanguage();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
