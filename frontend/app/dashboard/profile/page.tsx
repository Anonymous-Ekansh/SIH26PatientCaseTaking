"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/onboarding/signin");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");

      const { data: pat } = await supabase
        .from("patients")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (pat) {
        setName(pat.name || "");
        setPhone(pat.phone || "");
      }
    }
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit phone number");
      return;
    }

    setError("");
    setIsSaving(true);

    const { error: updateErr } = await supabase
      .from("patients")
      .upsert(
        {
          auth_user_id: userId,
          name: name.trim(),
          email: email,
          phone: phone.trim(),
        },
        { onConflict: "auth_user_id" }
      );

    setIsSaving(false);

    if (updateErr) {
      setError("Failed to save. Please try again.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Managed by your Google account</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 outline-none text-sm"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
                saved ? "bg-emerald-500" : isSaving ? "bg-sky-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600"
              }`}
            >
              <Save size={16} />
              {saved ? "Saved!" : isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
