"use client";

import React, { useState } from "react";
import SidebarTendik from '@/components/sidebar-tendik'; // Import Sidebar
import { 
  Search, 
  Bell, 
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

// --- MOCK DATA ---
const STUDENTS_PROGRESS = [
  {
    id: 1,
    nama: "Gerald Christopher",
    npm: "140810220014",
    judul: "Rancang Bangun Sistem Informasi Manajemen Sidang Skripsi Menggunakan Metode Extreme Programming",
    status: "Disetujui",
    pembimbing: "Dr. Juli Rejito, M.Kom",
  },
  {
    id: 2,
    nama: "Dobi Nugraha",
    npm: "140810220015",
    judul: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
    status: "Disetujui",
    pembimbing: "Dr. Juli Rejito, M.Kom",
  },
  {
    id: 3,
    nama: "Ridho Delfianov",
    npm: "140810220020",
    judul: "Analisis Ganjil Genap Pada Kawasan DKI Jakarta",
    status: "Disetujui",
    pembimbing: "Dr. Juli Rejito, M.Kom",
  },
  {
    id: 4,
    nama: "Naomi Thea",
    npm: "140810220025",
    judul: "Analisis Raspberry PI",
    status: "Disetujui",
    pembimbing: "Dr. Juli Rejito, M.Kom",
  },
];

export default function ProgresSemuaMahasiswaPage() {
  const [filterStatus, setFilterStatus] = useState("Proses Bimbingan");
  const [searchTerm, setSearchTerm] = useState("");

  return (
    // 1. Ubah container utama menjadi flex row
    <div className="flex min-h-screen bg-white font-sans text-slate-700">
      
      {/* 2. Render Sidebar di sini */}
      <SidebarTendik />

      {/* 3. Wrapper untuk konten kanan (Header + Main) */}
      {/* ml-64 digunakan karena sidebar memiliki width fixed w-64 dan fixed position */}
      <div className="flex-1 ml-64 flex flex-col">
        
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

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <div className="relative">
                <Bell size={22} className="text-gray-400" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </div>
            </button>
            <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">Pantau progres skripsi semua mahasiswa</h1>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            
            {/* Header Controls */}
            <div className="bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Manajemen Skripsi Mahasiswa</h2>

              <div className="flex gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Filter size={16} className="text-blue-500" />
                  </div>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-[#eff6ff] text-blue-600 text-sm font-bold border-none rounded-lg pl-10 pr-8 py-2.5 focus:ring-0 cursor-pointer appearance-none hover:bg-blue-100 transition-colors"
                  >
                    <option>Proses Bimbingan</option>
                    <option>Seminar</option>
                    <option>Sidang</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>

                <div className="relative w-64">
                  <input 
                    type="text" 
                    placeholder="Cari Data Mahasiswa"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg pl-4 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 placeholder:text-blue-800/50 text-blue-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800">Nama Mahasiswa</th>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800">NPM</th>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800 w-1/3">Judul Skripsi</th>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800 text-center">Status</th>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800">Pembimbing</th>
                    <th className="px-6 py-5 text-sm font-bold text-gray-800 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {STUDENTS_PROGRESS.map((mhs) => (
                    <tr key={mhs.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-6 text-sm font-bold text-gray-900 align-top">{mhs.nama}</td>
                      <td className="px-6 py-6 text-sm font-medium text-gray-600 align-top">{mhs.npm}</td>
                      <td className="px-6 py-6 text-sm font-bold text-gray-900 leading-relaxed align-top">
                        {mhs.judul}
                      </td>
                      <td className="px-6 py-6 text-center align-top">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[#56a789] text-white text-xs font-bold shadow-sm">
                          {mhs.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm font-medium text-gray-800 align-top whitespace-nowrap">
                        {mhs.pembimbing}
                      </td>
                      <td className="px-6 py-6 text-center align-top">
                        <Link href={`/kaprodi/dashboardkaprodi/detailprogres?id=${mhs.id}`}>
                          <button className="px-5 py-2 bg-[#9ca3af] hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer">
                            Lihat Detail
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-100">
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center bg-[#cccccc] text-gray-800 font-bold rounded text-sm">1</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-bold text-sm">2</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-bold text-sm">3</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-bold text-sm">4</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-bold text-sm">5</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-bold text-sm">6</button>
              <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}