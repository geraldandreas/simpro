"use client";

import React, { useState } from "react";
import { 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  User
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
    statusColor: "bg-[#a7b4a8]", // Hijau Sage / Muted Green
  },
];

export default function MahasiswaBimbinganPage() {
  // State sederhana untuk form (Visual only)
  const [metode, setMetode] = useState("Luring");

  return (
    // Layout wrapper: ml-64 untuk memberi ruang pada sidebar yang ada di layout.tsx
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
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mahasiswa Bimbingan</h1>
          <p className="text-gray-600 text-base">
            Daftar mahasiswa yang berada di bawah bimbingan Anda.
            <br />
            Pantau progress skripsi mahasiswa dan beri persetujuan akademik.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* KOLOM KIRI: TABEL MAHASISWA */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Daftar Mahasiswa Bimbingan</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Nama Mahasiswa</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">NPM</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Progres Skripsi</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {STUDENTS.map((mhs) => (
                    <tr key={mhs.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-sm font-bold text-gray-800">{mhs.nama}</td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-600">{mhs.npm}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-white text-xs font-bold ${mhs.statusColor} shadow-sm`}>
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
            {/* Empty space filler like design */}
            <div className="h-10"></div>
          </div>

          {/* KOLOM KANAN: JADWAL & FORM */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            
            {/* Bagian Kalender */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Jadwal Bimbingan</h2>
            <div className="border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-800">Januari 2025</span>
                <div className="flex gap-2">
                    <ChevronLeft size={16} className="text-gray-400 cursor-pointer hover:text-gray-800" />
                    <ChevronRight size={16} className="text-gray-400 cursor-pointer hover:text-gray-800" />
                </div>
              </div>
              
              {/* Calendar Grid Mockup */}
              <div className="grid grid-cols-7 text-center text-xs gap-y-3 font-medium text-gray-600">
                <div className="font-bold text-gray-800">S</div>
                <div className="font-bold text-gray-800">S</div>
                <div className="font-bold text-gray-800">R</div>
                <div className="font-bold text-gray-800">K</div>
                <div className="font-bold text-gray-800">J</div>
                <div className="font-bold text-gray-800">S</div>
                <div className="font-bold text-gray-800">M</div>

                {/* Empty cells for prev month */}
                <div></div><div></div><div></div>
                
                {/* Dates */}
                <div className="py-1">1</div><div className="py-1">2</div><div className="py-1">3</div><div className="py-1">4</div>
                <div className="py-1">5</div><div className="py-1">6</div><div className="py-1">7</div><div className="py-1">8</div><div className="py-1">9</div><div className="py-1">10</div><div className="py-1">11</div>
                <div className="py-1">12</div><div className="py-1">13</div><div className="py-1">14</div><div className="py-1">15</div><div className="py-1">16</div><div className="py-1">17</div><div className="py-1">18</div>
                <div className="py-1">19</div><div className="py-1">20</div><div className="py-1">21</div><div className="py-1">22</div><div className="py-1">23</div><div className="py-1">24</div><div className="py-1">25</div>
                <div className="py-1">26</div><div className="py-1">27</div><div className="py-1">28</div><div className="py-1">29</div><div className="py-1">30</div><div className="py-1">31</div>
              </div>
            </div>

            {/* Bagian Form */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-gray-900">Atur Jadwal Bimbingan</h3>
              
              <div className="grid grid-cols-2 gap-3">
                 {/* Tanggal Dummy */}
                 <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-blue-500" />
                 {/* Jam Dummy */}
                 <input type="time" className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Sesi Bimbingan ke-</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500 text-gray-600">
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Pilih Metode Bimbingan</label>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-medium">
                        <input 
                            type="radio" 
                            name="metode" 
                            value="Luring" 
                            checked={metode === "Luring"} 
                            onChange={() => setMetode("Luring")}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        Luring
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-medium">
                        <input 
                            type="radio" 
                            name="metode" 
                            value="Daring" 
                            checked={metode === "Daring"} 
                            onChange={() => setMetode("Daring")}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        Daring
                    </label>
                </div>
              </div>

              <input 
                type="text" 
                placeholder="-- Catatan Ruangan/Link Zoom --" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-400 text-center"
              />

              <button className="w-full bg-[#345d8a] hover:bg-[#2a4a6e] text-white font-bold py-3 rounded-lg text-xs shadow-md transition-colors">
                Terapkan untuk semua mahasiswa bimbingan
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}