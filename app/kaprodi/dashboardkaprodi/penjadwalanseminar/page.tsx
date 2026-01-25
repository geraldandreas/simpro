"use client";

import React, { useState } from "react";
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown,
  FileText,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

// --- MOCK DATA ---
const STUDENT_DATA = {
  name: "Vera Setiawati",
  npm: "140810220013",
  title: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
  pembimbing1: "Rudi Rosadi, M.Kom",
  pembimbing2: "Rudi Rosadi, M.Kom",
  filename: "Proposal_Skripsi_Vera_Setiawati.pdf"
};

const LECTURERS = [
  "Dr. Juli Rejito, M.Kom",
  "Rudi Rosadi, M.Kom",
  "Dr. Akmal, S.Si",
  "Intan Nurma, M.T"
];

export default function PenetapanJadwalPage() {
  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [ruangan, setRuangan] = useState("");

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
      <main className="flex-1 p-8">

        {/* ===== BACK BUTTON & TITLE ===== */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/kaprodi/dashboardkaprodi/pengajuanseminar" // ⚠️ sesuaikan route list kamu
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>

          <h1 className="text-xl font-bold text-gray-900">
            Penetapan Jadwal Seminar
          </h1>
        </div>

        {/* ===== GRID LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ================= LEFT COLUMN ================= */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* --- STUDENT INFO CARD --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                    <User size={40} className="text-gray-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{STUDENT_DATA.name}</h2>
                    <p className="text-gray-500 font-medium mt-1">{STUDENT_DATA.npm}</p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Judul Proposal
                </h3>
                <p className="text-lg font-bold text-gray-800 leading-relaxed">
                  {STUDENT_DATA.title}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100">
                {[STUDENT_DATA.pembimbing1, STUDENT_DATA.pembimbing2].map((name, idx) => (
                  <div key={idx} className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User size={22} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Pembimbing {idx + 1}
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        {name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- FILE CARD --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                File Skripsi Mahasiswa
              </h3>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors bg-white">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate pr-4">
                      {STUDENT_DATA.filename}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      PDF Document
                    </p>
                  </div>
                </div>
                
                <button className="px-6 py-2.5 bg-[#345d8a] text-white text-xs font-bold rounded-lg hover:bg-[#2a4a6e] transition-colors shadow-sm whitespace-nowrap">
                  Lihat PDF
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="lg:col-span-1 space-y-6">

            {/* --- DATE FORM --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal</label>
                  <input 
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Jam</label>
                  <input 
                    type="time"
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ruangan</label>
                  <input 
                    type="text"
                    value={ruangan}
                    onChange={(e) => setRuangan(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* --- EXAMINER FORM --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Dosen Penguji
              </h2>

              <div className="space-y-5">
                {[penguji1, penguji2].map((val, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Penguji {idx + 1}
                    </label>
                    <div className="relative">
                      <select 
                        value={val}
                        onChange={(e) => idx === 0 ? setPenguji1(e.target.value) : setPenguji2(e.target.value)}
                        className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm"
                      >
                        <option value="">-- Pilih Dosen Penguji --</option>
                        {LECTURERS.map((lec, i) => (
                          <option key={i} value={lec}>{lec}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                ))}

                <button className="w-full mt-4 bg-[#669E8E] hover:bg-[#528577] text-white font-bold py-3 rounded-lg transition">
                  Tetapkan Jadwal
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
