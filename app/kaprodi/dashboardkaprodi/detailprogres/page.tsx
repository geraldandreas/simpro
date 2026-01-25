"use client";

import React from "react";
import { 
  Search, 
  Bell, 
  Check, 
  BookOpen, 
  User, 
  MessageCircle,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- MOCK DATA ---
const STUDENT_DATA = {
  name: "Gerald Christopher Andreas",
  npm: "140810220014",
  judul: "Rancang Bangun Sistem Informasi Manajemen Sidang Skripsi Menggunakan Metode Extreme Programming",
};

const TIMELINE_STEPS = [
  { label: "Pengajuan Proposal", status: "completed" },
  { label: "Persetujuan Proposal", status: "completed" },
  { label: "Proses Bimbingan", status: "current" },
  { label: "Persetujuan Kesiapan Seminar", status: "upcoming" },
  { label: "Unggah Dokumen Seminar", status: "upcoming" },
  { label: "Verifikasi Tendik", status: "upcoming" },
  { label: "Seminar", status: "upcoming" },
  { label: "Perbaikan Pasca Seminar", status: "upcoming" },
  { label: "Sidang Skripsi", status: "upcoming" },
];

const GUIDANCE_HISTORY = [
  { session: "Sesi 1", topic: "Bimbingan dengan Dr. Juli", date: "20 November 2025" },
  { session: "Sesi 2", topic: "Bimbingan dengan Dr. Juli", date: "25 November 2025" },
  { session: "Sesi 3", topic: "Bimbingan dengan Dr. Juli", date: "1 Oktober 2025" },
];

const SUPERVISORS = [
  { name: "Dr. Juli Rejito, M.Kom", role: "Pembimbing Utama" },
  { name: "Rudi Rosadi, S.Si, M.Kom", role: "Co-Pembimbing" },
];

export default function DetailProgresPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans text-slate-700">
      
      {/* --- HEADER --- */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
          />
        </div>

        <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
          <Bell size={22} className="text-gray-400" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-8 pb-24">
        
        {/* ✅ BACK BUTTON (sesuai referensi) */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Student Info Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{STUDENT_DATA.name}</h1>
          <p className="text-gray-500 text-lg mb-4">NPM: {STUDENT_DATA.npm}</p>
          <h2 className="text-xl font-bold text-gray-900 leading-relaxed max-w-4xl">
            {STUDENT_DATA.judul}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* KOLOM KIRI */}
          <div className="lg:col-span-2 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-8">Linimasa Progres Skripsi</h3>
            
            <div className="relative pl-2">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

              <div className="space-y-8">
                {TIMELINE_STEPS.map((step, index) => (
                  <TimelineItem key={index} label={step.label} status={step.status as any} />
                ))}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Riwayat */}
            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Riwayat Bimbingan</h3>
              <div className="space-y-6">
                {GUIDANCE_HISTORY.map((history, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        <span className="font-extrabold text-gray-900">{history.session} :</span> {history.topic}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{history.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full text-center text-blue-600 text-sm font-bold mt-6 hover:underline">
                Lihat Semua
              </button>
            </div>

            {/* Dosen */}
            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Dosen Pembimbing</h3>
              <div className="space-y-6">
                {SUPERVISORS.map((dosen, idx) => (
                  <div key={idx} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                       <User size={48} className="text-gray-400 relative top-2 left-0" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{dosen.name}</p>
                      <p className="text-xs text-gray-500 font-medium">{dosen.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Chat Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#345d8a] hover:bg-[#2a4a6e] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105">
        <MessageCircle size={28} />
      </button>

    </div>
  );
}

// --- TIMELINE ITEM ---
function TimelineItem({ label, status }: { label: string; status: 'completed' | 'current' | 'upcoming' }) {
  let iconContent;
  let labelClass = "text-gray-500 font-medium";

  if (status === 'completed') {
    iconContent = (
      <div className="w-8 h-8 rounded-full bg-[#56a789] flex items-center justify-center z-10 relative border-4 border-white">
        <Check size={16} className="text-white" strokeWidth={3} />
      </div>
    );
    labelClass = "text-gray-800 font-medium";
  } 
  else if (status === 'current') {
    iconContent = (
      <div className="w-8 h-8 rounded-full bg-[#eab308] flex items-center justify-center z-10 relative border-4 border-white shadow-sm">
        <div className="w-3 h-3 bg-white rounded-full" />
      </div>
    );
    labelClass = "text-gray-900 font-bold";
  } 
  else {
    iconContent = (
      <div className="w-8 h-8 rounded-full bg-gray-300 z-10 relative border-4 border-white"></div>
    );
    labelClass = "text-gray-400 font-medium";
  }

  return (
    <div className="flex items-center gap-6 relative">
      <div className="shrink-0 flex items-center justify-center w-8">
        {iconContent}
      </div>
      <span className={`text-sm ${labelClass}`}>
        {label}
      </span>
    </div>
  );
}
