"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

/* ── Progress Dots ── */
function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i <= current
              ? "bg-[#0EA5E9]"
              : "bg-white border-2 border-[#E5E7EB]"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingDetails() {
  const router = useRouter();
  const supabase = createClient();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  
  const [errors, setErrors] = useState<{ name?: string; phone?: string; submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        if (user.user_metadata?.full_name) {
          setName(user.user_metadata.full_name);
        }
      } else {
        router.push("/onboarding/signin");
      }
    }
    loadUser();
  }, [supabase, router]);

  const handleContinue = async () => {
    const newErrors: { name?: string; phone?: string; submit?: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(phone.trim()))
      newErrors.phone = "Enter a valid 10-digit phone number";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const { error } = await supabase
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

    setIsSubmitting(false);

    if (error) {
      setErrors({ submit: "Failed to save details. Please try again." });
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-4 border-b border-[#E5E7EB]">
        <span className="font-bold text-lg tracking-tight text-[#1A1A1A]">
          Medi<span className="text-[#0EA5E9]">Kiosk</span>
        </span>
      </div>

      <ProgressDots current={2} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <button
            onClick={() => router.push("/onboarding/signin")}
            className="flex items-center gap-1 text-[#6B7280] text-sm mb-6 hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 md:p-8">
            <h1 className="text-xl font-bold text-[#1A1A1A] mb-1 text-center">
              Your details
            </h1>
            <p className="text-[#6B7280] text-sm mb-8 text-center">
              We need a few details to get started
            </p>

            {name && (
              <h2 className="text-lg font-semibold text-[#0EA5E9] mb-4 text-center">
                Welcome, {name}
              </h2>
            )}

            <div className="flex flex-col gap-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                    errors.name
                      ? "border-[#DC2626] focus:border-[#DC2626]"
                      : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                  }`}
                />
                {errors.name && (
                  <p className="text-[#DC2626] text-xs mt-1.5">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Phone number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                    errors.phone
                      ? "border-[#DC2626] focus:border-[#DC2626]"
                      : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                  }`}
                />
                {errors.phone && (
                  <p className="text-[#DC2626] text-xs mt-1.5">{errors.phone}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <p className="text-[#DC2626] text-sm text-center mb-4">{errors.submit}</p>
            )}

            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className={`w-full py-3.5 text-white font-semibold rounded-xl transition-colors active:scale-[0.97] min-h-[56px] ${
                isSubmitting ? "bg-sky-400 cursor-not-allowed" : "bg-[#0EA5E9] hover:bg-sky-600"
              }`}
            >
              {isSubmitting ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
