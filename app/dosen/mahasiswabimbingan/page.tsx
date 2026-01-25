"use client";

import React, { useState } from "react";
import Sidebar from "@/components/sidebar-dosen"; // Pastikan path import sesuai struktur folder Anda
import { 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";

// --- MOCK DATA ---
const STUDENTS = [
  {
    id: 1,
    nama: "Vera Setiawati",
    npm: "140810220013",
    status: "Pengajuan Proposal",
    statusColor: "bg-[#eab308]", // Kuning Gold
  },
  {
    id: 2,
    nama: "Gerald Christopher Andreas",
    npm: "140810220014",
    status: "Proses Kesiapan Seminar",
    statusColor: "bg-[#60a5fa]", // Biru
  },
  {
    id: 3,
    nama: "Dobi Nugraha",
    npm: "140810220015",
    status: "Proses Bimbingan",
    statusColor: "bg-[#a7b4a8]", // Hijau Sage
  },
];

export default function MahasiswaBimbinganPage() {
  const [metode, setMetode] = useState("Luring");

  return (
    // 1. Parent Container menggunakan 'flex' agar Sidebar dan Konten berdampingan
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      
      {/* 2. Render Sidebar di sebelah kiri */}
      <Sidebar />

      {/* 3. Wrapper Konten Utama (Kanan) - flex-1 agar memenuhi sisa layar */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* --- HEADER --- */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-gray-400"
            />
          </div>

          <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
            <Bell size={22} className="text-gray-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-8">
          
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mahasiswa Bimbingan</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Daftar mahasiswa yang berada di bawah bimbingan Anda.
              <br />
              Pantau progress skripsi mahasiswa dan beri persetujuan akademik.
            </p>
          </div>

          {/* Grid Layout: Kiri (Tabel) & Kanan (Jadwal) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* === KOLOM KIRI: TABEL MAHASISWA === */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Daftar Mahasiswa Bimbingan</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-500">Nama Mahasiswa</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-500">NPM</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-500 text-center">Progres Skripsi</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-gray-500 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {STUDENTS.map((mhs) => (
                      <tr key={mhs.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-5 text-sm font-bold text-gray-900">{mhs.nama}</td>
                        <td className="px-6 py-5 text-sm font-medium text-gray-500">{mhs.npm}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wide ${mhs.statusColor} shadow-sm`}>
                            {mhs.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button className="px-4 py-2 bg-[#9ca3af] hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Filler space bawah tabel */}
              <div className="h-6 bg-white"></div>
            </div>

            {/* === KOLOM KANAN: JADWAL & FORM === */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
              
              {/* Bagian Kalender */}
              <h2 className="text-lg font-bold text-gray-900 mb-4">Jadwal Bimbingan</h2>
              <div className="border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-gray-800">Januari 2025</span>
                  <div className="flex gap-2">
                      <ChevronLeft size={18} className="text-gray-400 cursor-pointer hover:text-gray-800 transition-colors" />
                      <ChevronRight size={18} className="text-gray-400 cursor-pointer hover:text-gray-800 transition-colors" />
                  </div>
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 text-center text-xs gap-y-4 font-medium text-gray-500">
                  <div className="font-bold text-gray-900">S</div>
                  <div className="font-bold text-gray-900">S</div>
                  <div className="font-bold text-gray-900">R</div>
                  <div className="font-bold text-gray-900">K</div>
                  <div className="font-bold text-gray-900">J</div>
                  <div className="font-bold text-gray-900">S</div>
                  <div className="font-bold text-gray-900">M</div>

                  {/* Empty cells */}
                  <div></div><div></div><div></div>
                  
                  {/* Dates */}
                  {[...Array(31)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`py-1 cursor-pointer rounded-full hover:bg-gray-100 ${i+1 === 23 ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" : ""}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bagian Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Atur Jadwal Bimbingan</h3>
                
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                   <input type="time" className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Sesi Bimbingan ke-</label>
                  <div className="relative">
                    <select className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-600">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                    </select>
                    {/* Arrow icon absolute position */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Metode Bimbingan</label>
                  <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium select-none">
                          <input 
                              type="radio" 
                              name="metode" 
                              value="Luring" 
                              checked={metode === "Luring"} 
                              onChange={() => setMetode("Luring")}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          />
                          Luring
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium select-none">
                          <input 
                              type="radio" 
                              name="metode" 
                              value="Daring" 
                              checked={metode === "Daring"} 
                              onChange={() => setMetode("Daring")}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          />
                          Daring
                      </label>
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="-- Catatan Ruangan/Link Zoom --" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:text-gray-400 text-center border-dashed"
                />

                <button className="w-full bg-[#3B65A3] hover:bg-[#2e5288] text-white font-bold py-3 rounded-lg text-xs shadow-md transition-all active:scale-[0.98]">
                  Terapkan untuk semua mahasiswa bimbingan
                </button>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}