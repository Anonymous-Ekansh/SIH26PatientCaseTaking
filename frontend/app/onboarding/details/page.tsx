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
  
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  
  // Doctor specific fields
  const [system, setSystem] = useState<"allopathy" | "ayurveda">("allopathy");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  
  const [errors, setErrors] = useState<any>({});
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
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(phone.trim()))
      newErrors.phone = "Enter a valid 10-digit phone number";

    if (role === "doctor") {
      if (!specialization.trim()) newErrors.specialization = "Specialization is required";
      if (!qualification.trim()) newErrors.qualification = "Qualification is required";
      if (!experience.trim() || isNaN(Number(experience))) newErrors.experience = "Valid experience years required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    if (role === "patient") {
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
    } else {
      const { error } = await supabase
        .from("doctors")
        .upsert(
          {
            auth_user_id: userId,
            name: name.trim(),
            email: email,
            phone: phone.trim(),
            system: system,
            specialization: specialization.trim(),
            qualification: qualification.trim(),
            experience_years: parseInt(experience, 10),
          },
          { onConflict: "auth_user_id" }
        );

      setIsSubmitting(false);

      if (error) {
        setErrors({ submit: "Failed to save details. Please try again." });
        return;
      }
      router.push("/doctor/dashboard");
    }
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
            <p className="text-[#6B7280] text-sm mb-6 text-center">
              Are you registering as a patient or doctor?
            </p>

            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
              <button
                onClick={() => setRole("patient")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === "patient" ? "bg-white shadow-sm text-sky-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Patient
              </button>
              <button
                onClick={() => setRole("doctor")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === "doctor" ? "bg-white shadow-sm text-sky-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Doctor
              </button>
            </div>

            <div className="flex flex-col gap-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Full name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p: any) => ({ ...p, name: undefined }));
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                    errors.name ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                  }`}
                />
                {errors.name && <p className="text-[#DC2626] text-xs mt-1.5">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Phone number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((p: any) => ({ ...p, phone: undefined }));
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                    errors.phone ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                  }`}
                />
                {errors.phone && <p className="text-[#DC2626] text-xs mt-1.5">{errors.phone}</p>}
              </div>

              {role === "doctor" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Medical System</label>
                    <select
                      value={system}
                      onChange={(e) => setSystem(e.target.value as "allopathy" | "ayurveda")}
                      className="w-full px-4 py-3.5 rounded-xl border border-[#E5E7EB] focus:border-[#0EA5E9] text-base outline-none bg-white min-h-[56px]"
                    >
                      <option value="allopathy">Allopathy (Modern Medicine)</option>
                      <option value="ayurveda">Ayurveda</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. General Physician, Kayachikitsa"
                      value={specialization}
                      onChange={(e) => {
                        setSpecialization(e.target.value);
                        if (errors.specialization) setErrors((p: any) => ({ ...p, specialization: undefined }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                        errors.specialization ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                      }`}
                    />
                    {errors.specialization && <p className="text-[#DC2626] text-xs mt-1.5">{errors.specialization}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Qualification</label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD, BAMS"
                      value={qualification}
                      onChange={(e) => {
                        setQualification(e.target.value);
                        if (errors.qualification) setErrors((p: any) => ({ ...p, qualification: undefined }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                        errors.qualification ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                      }`}
                    />
                    {errors.qualification && <p className="text-[#DC2626] text-xs mt-1.5">{errors.qualification}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Experience (Years)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={experience}
                      onChange={(e) => {
                        setExperience(e.target.value);
                        if (errors.experience) setErrors((p: any) => ({ ...p, experience: undefined }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl border text-base outline-none transition-colors min-h-[56px] ${
                        errors.experience ? "border-[#DC2626]" : "border-[#E5E7EB] focus:border-[#0EA5E9]"
                      }`}
                    />
                    {errors.experience && <p className="text-[#DC2626] text-xs mt-1.5">{errors.experience}</p>}
                  </div>
                </>
              )}
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
