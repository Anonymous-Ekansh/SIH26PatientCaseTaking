import Link from "next/link";

export default function KioskPage() {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
        Trial<span className="text-sky-500">Saathi</span> Kiosk
      </h1>
      <p className="text-lg text-slate-600 mb-8 max-w-xl">
        Welcome to the participant kiosk. Here you can securely provide your consent, answer form questionnaires, and enter visit details via voice or touch.
      </p>
      
      <div className="flex gap-4">
        <button className="px-8 py-4 bg-sky-500 text-white font-bold rounded-xl shadow-lg hover:bg-sky-600 transition-colors">
          Start Check-in
        </button>
        <Link 
          href="/" 
          className="px-8 py-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
