"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Calendar, Users, Plus, Clock, FileText } from "lucide-react";

export default function DoctorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [doctor, setDoctor] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Slot State
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/onboarding/signin");
          return;
        }

        // 1. Fetch Doctor
        const { data: doc, error: docErr } = await supabase
          .from("doctors")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
          
        if (docErr || !doc) {
          router.push("/onboarding/details");
          return;
        }
        setDoctor(doc);

        // 2. Fetch Slots (today & future)
        const today = new Date().toISOString().split('T')[0];
        const { data: slotsData } = await supabase
          .from("doctor_availability_slots")
          .select("*")
          .eq("doctor_id", doc.id)
          .gte("date", today)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });
        
        if (slotsData) setSlots(slotsData);

        // 3. Fetch Bookings via backend API (bypasses RLS)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const bookingsRes = await fetch(`${apiUrl}/api/documents/doctor-bookings/${user.id}`);
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [supabase, router]);

  const handleAddSlot = async () => {
    if (!doctor) return;
    setIsAddingSlot(true);
    try {
      const { data, error } = await supabase
        .from("doctor_availability_slots")
        .insert({
          doctor_id: doctor.id,
          date: slotDate,
          start_time: startTime,
          end_time: endTime,
          status: "available"
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setSlots(prev => [...prev, data].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      }));
      
    } catch (err) {
      console.error(err);
      alert("Failed to add slot");
    } finally {
      setIsAddingSlot(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dr. {doctor?.name}</h1>
          <p className="text-sm text-gray-500">{doctor?.specialization}</p>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} className="text-sm font-medium text-red-600 hover:text-red-700">
          Sign out
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Slots Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="text-sky-500" size={20} />
              Manage Slots
            </h2>
            
            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                <input 
                  type="date" 
                  value={slotDate} 
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-sky-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start</label>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End</label>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-sky-500 text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddSlot}
                disabled={isAddingSlot}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming Slots</h3>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming slots found.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {slots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{slot.date}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                      slot.status === 'booked' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Patients/Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="text-indigo-500" size={20} />
              Patient Appointments
            </h2>

            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Users size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No appointments booked yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-gray-300 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{booking.patients?.name || "Patient"}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Calendar size={14} /> {booking.doctor_availability_slots?.date} at {booking.doctor_availability_slots?.start_time?.substring(0,5)}
                      </p>
                      <span className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 uppercase">
                        {booking.status}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => router.push(`/doctor/summary/${booking.encounter_id}`)}
                      disabled={!booking.encounter_id}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        booking.encounter_id 
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <FileText size={16} />
                      {booking.encounter_id ? "View Case Summary" : "Not Started Yet"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
