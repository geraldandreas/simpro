"use client";

import React, { useState } from "react";
import { 
  Search, 
  Bell, 
  User, 
  FileText, 
  ChevronDown, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

// --- MOCK DATA ---
const STUDENT_DATA = {
  id: "1",
  name: "Vera Setiawati",
  npm: "140810220013",
  judul: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
  file_name: "Proposal_Skripsi_Vera_Setiawati.pdf",
  file_url: "#"
};

const DOSEN_LIST = [
  { id: 1, nama: "Dr. Budi Santoso, M.Kom" },
  { id: 2, nama: "Prof. Siti Aminah, M.T." },
  { id: 3, nama: "Rizky Pratama, S.Kom., M.Kom." },
  { id: 4, nama: "Dr. Akmal, S.Si" },
];

export default function DetailProposalKaprodi() {
  const [pembimbing1, setPembimbing1] = useState("");
  const [pembimbing2, setPembimbing2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTugaskan = () => {
    if (!pembimbing1) {
      alert("Harap pilih Pembimbing 1 terlebih dahulu.");
      return;
    }
    if (pembimbing1 === pembimbing2) {
      alert("Pembimbing 1 dan 2 tidak boleh sama.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("✅ Dosen Pembimbing berhasil ditugaskan!");
    }, 1500);
  };

  return (
    // Struktur Layout Utama
    // Asumsi: Sidebar sudah ada di layout.tsx dan memiliki width w-64 (256px)
    // ml-64 digunakan agar konten tidak tertutup sidebar yang fixed
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

        <div className="flex items-center gap-6">
          <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
            <Bell size={22} className="text-gray-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
            <div className="text-right hidden md:block">
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-8">
        
        {/* Title & Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            // Pastikan path ini sesuai dengan route halaman list proposal Anda
            href="/kaprodi/dashboardkaprodi/aksesproposal" 
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Detail Proposal Mahasiswa</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* KOLOM KIRI (Detail Mahasiswa & File) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Info Mahasiswa */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                    <User size={40} className="text-gray-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{STUDENT_DATA.name}</h2>
                    <p className="text-gray-500 font-medium mt-1">{STUDENT_DATA.npm}</p>
                  </div>
                </div>
              </div>
              
              {/* Bagian Judul (Background Abu) */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Judul Proposal</h3>
                <p className="text-lg font-bold text-gray-800 leading-relaxed">
                  {STUDENT_DATA.judul}
                </p>
              </div>
            </div>

            {/* Card File Proposal */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">File Proposal Mahasiswa</h3>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors bg-white">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate pr-4">{STUDENT_DATA.file_name}</p>
                    <p className="text-xs text-gray-400 font-medium">PDF Document</p>
                  </div>
                </div>
                
                <button className="px-6 py-2.5 bg-[#345d8a] text-white text-xs font-bold rounded-lg hover:bg-[#2a4a6e] transition-colors shadow-sm whitespace-nowrap">
                  Lihat PDF
                </button>
              </div>
            </div>

          </div>

          {/* KOLOM KANAN (Form Assign Dosen) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                Pilih Dosen Pembimbing
              </h2>

              <div className="space-y-6">
                {/* Input Pembimbing 1 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Pembimbing 1</label>
                  <div className="relative">
                    <select 
                      value={pembimbing1}
                      onChange={(e) => setPembimbing1(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-10 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-sm cursor-pointer transition-all hover:border-gray-400"
                    >
                      <option value="">-- Pilih Dosen Pembimbing 1 --</option>
                      {DOSEN_LIST.map((d) => (
                        <option key={d.id} value={d.id}>{d.nama}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Input Pembimbing 2 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Pembimbing 2</label>
                  <div className="relative">
                    <select 
                      value={pembimbing2}
                      onChange={(e) => setPembimbing2(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-10 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-sm cursor-pointer transition-all hover:border-gray-400"
                    >
                      <option value="">-- Pilih Dosen Pembimbing 2 --</option>
                      {DOSEN_LIST.map((d) => (
                        <option key={d.id} value={d.id}>{d.nama}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  onClick={handleTugaskan}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#345d8a] text-white font-bold rounded-xl hover:bg-[#2a4a6e] transition-all shadow-md hover:shadow-lg active:scale-95 text-sm disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? "Memproses..." : "Tugaskan Dosen Pembimbing"}
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}