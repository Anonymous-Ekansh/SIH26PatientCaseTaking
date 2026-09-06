"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Calendar, Clock, CheckCircle } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

const ALLOPATHY_SPECS = [
  "General Physician",
  "Gynecologist",
  "Pediatrician",
  "Orthopedic",
  "Dermatologist",
  "ENT",
  "Neurologist",
  "Cardiologist",
  "Psychiatrist",
  "Ophthalmologist",
  "General Surgeon",
  "Gastroenterologist",
  "Pulmonologist",
  "Endocrinologist",
];

const AYURVEDA_SPECS = [
  "Kayachikitsa (General Med)",
  "Prasuti Tantra (Ob-Gyn)",
  "Kaumarabhritya (Pediatrics)",
  "Shalya Tantra (Surgery)",
  "Shalakya Tantra (ENT/Eye)",
  "Panchakarma",
  "Rasayana (Rejuvenation)",
  "Agada Tantra (Toxicology)",
  "Swasthavritta (Preventive)",
];

export default function BookConsultation() {
  const router = useRouter();
  const supabase = createClient();

  const [system, setSystem] = useState<"allopathy" | "ayurveda">("allopathy");
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/onboarding/signin");
        return;
      }
      
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
        
      if (patient) setPatientId(patient.id);
    }
    init();
  }, [supabase, router]);

  // Fetch doctors when specialization changes
  useEffect(() => {
    if (!selectedSpec) {
      setDoctors([]);
      return;
    }
    
    async function fetchDoctors() {
      const { data } = await supabase
        .from("doctors")
        .select("*")
        .eq("system", system)
        .eq("specialization", selectedSpec);
      setDoctors(data || []);
      setSelectedDoctor(null);
      setSelectedSlot(null);
    }
    fetchDoctors();
  }, [selectedSpec, system, supabase]);

  // Fetch slots when doctor is selected
  useEffect(() => {
    if (!selectedDoctor) {
      setSlots([]);
      return;
    }
    
    async function fetchSlots() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("doctor_availability_slots")
        .select("*")
        .eq("doctor_id", selectedDoctor.id)
        .eq("status", "available")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
        
      setSlots(data || []);
      setSelectedSlot(null);
    }
    fetchSlots();
  }, [selectedDoctor, supabase]);

  const handleSystemChange = (sys: "allopathy" | "ayurveda") => {
    setSystem(sys);
    setSelectedSpec(null);
  };

  const handleBook = async () => {
    if (!selectedSlot || !patientId || !selectedDoctor) return;
    setIsBooking(true);
    
    try {
      // 1. Mark slot as booked
      const { error: slotErr } = await supabase
        .from("doctor_availability_slots")
        .update({ status: "booked" })
        .eq("id", selectedSlot.id)
        .eq("status", "available"); // Ensure it's still available

      if (slotErr) {
        alert("This slot was just booked by someone else. Please select another.");
        setIsBooking(false);
        return;
      }
      
      // 2. Check for existing encounter
      let activeEncounterId = null;
      let shouldRetakeHistory = false;
      
      const { data: existingEncounter } = await supabase
        .from("encounters")
        .select("id")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (existingEncounter) {
        activeEncounterId = existingEncounter.id;
      } else {
        // Create new encounter
        const { data: newEncounter, error: encErr } = await supabase
          .from("encounters")
          .insert({
            patient_id: patientId,
            status: "in_progress"
          })
          .select()
          .single();
          
        if (encErr) throw encErr;
        activeEncounterId = newEncounter.id;
        shouldRetakeHistory = true;
      }

      // 3. Create booking
      const { error: bookErr } = await supabase
        .from("bookings")
        .insert({
          patient_id: patientId,
          doctor_id: selectedDoctor.id,
          slot_id: selectedSlot.id,
          encounter_id: activeEncounterId,
          status: "booked"
        });
        
      if (bookErr) throw bookErr;

      // 4. Redirect
      if (shouldRetakeHistory) {
        if (system === "ayurveda") {
          router.push("/dashboard/ayush");
        } else {
          router.push("/dashboard/conversation");
        }
      } else {
        alert("Booking confirmed! The doctor will review your existing summary.");
        router.push("/dashboard/summary");
      }

    } catch (err) {
      console.error(err);
      alert("Error booking consultation. Please try again.");
      setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Book Consultation</h1>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-24">
        {/* Step 1: System Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex mb-6">
          <button
            onClick={() => handleSystemChange("allopathy")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              system === "allopathy" ? "bg-sky-50 text-sky-600" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Allopathy (Modern)
          </button>
          <button
            onClick={() => handleSystemChange("ayurveda")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              system === "ayurveda" ? "bg-emerald-50 text-emerald-600" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Ayurveda
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Specialization List */}
          <div className="col-span-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Specialization</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {(system === "allopathy" ? ALLOPATHY_SPECS : AYURVEDA_SPECS).map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`w-full text-left px-5 py-3.5 border-b border-gray-100 last:border-0 text-sm font-medium transition-colors ${
                      selectedSpec === spec 
                        ? (system === "allopathy" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700")
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Doctors & Slots */}
          <div className="col-span-1 md:col-span-2">
            {!selectedSpec ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 h-full flex items-center justify-center p-8 text-center text-gray-500 min-h-[300px]">
                Please select a specialization from the list to view available doctors.
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Available Doctors</h2>
                
                {doctors.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
                    No doctors available for this specialization right now.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {doctors.map(doc => (
                      <div 
                        key={doc.id} 
                        className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                          selectedDoctor?.id === doc.id 
                            ? (system === "allopathy" ? "border-sky-500 shadow-md" : "border-emerald-500 shadow-md") 
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div 
                          className="p-5 flex items-center gap-4 cursor-pointer"
                          onClick={() => setSelectedDoctor(doc)}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${system === "allopathy" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"}`}>
                            <User size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">Dr. {doc.name}</h3>
                            <p className="text-sm text-gray-500">{doc.qualification} • {doc.experience_years} yrs exp</p>
                          </div>
                        </div>

                        {/* Slots (only show if selected) */}
                        {selectedDoctor?.id === doc.id && (
                          <div className="border-t border-gray-100 bg-gray-50 p-5">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Calendar size={14} /> Available Slots
                            </h4>
                            
                            {slots.length === 0 ? (
                              <p className="text-sm text-gray-500">No available slots found for Dr. {doc.name}.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {slots.map(slot => {
                                  // Format time nicely
                                  const timeStr = slot.start_time.substring(0, 5);
                                  const isSelected = selectedSlot?.id === slot.id;
                                  return (
                                    <button
                                      key={slot.id}
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isSelected 
                                          ? (system === "allopathy" ? "bg-sky-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm")
                                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-400"
                                      }`}
                                    >
                                      {slot.date} {timeStr}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking Appointment with</p>
              <p className="font-bold text-gray-900">Dr. {selectedDoctor.name} at {selectedSlot.start_time.substring(0,5)}</p>
            </div>
            <button
              onClick={handleBook}
              disabled={isBooking}
              className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-sm transition-all flex items-center gap-2 ${
                isBooking ? "opacity-70 cursor-not-allowed" : "hover:shadow-md"
              } ${system === "allopathy" ? "bg-sky-500 hover:bg-sky-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
            >
              {isBooking ? (
                <span>Confirming...</span>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Confirm & Proceed</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
