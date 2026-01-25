"use client";

import React from "react";
import Link from "next/link"; 
import Sidebar from "@/components/sidebar-dosen"; // 1. Import Sidebar di sini
import { 
  Search, Bell, ChevronDown, Hourglass 
} from 'lucide-react';

export default function AksesProposalPage() {
  // Data dummy sesuai gambar (Tanpa Fetch)
  const proposals = [
    {
      id: 1,
      nama: "Vera Setiawati",
      npm: "140810220013",
      judul: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
      bidang: "AI",
      status: "Menunggu Verifikasi",
    },
    {
      id: 2,
      nama: "Budi Santoso",
      npm: "140810220045",
      judul: "Implementasi IoT pada Smart Farming Hidroponik",
      bidang: "IoT",
      status: "Diterima",
    },
  ];

  return (
    // 2. Parent Container Flexbox: Sidebar di kiri, Konten di kanan
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      
      {/* 3. Render Sidebar Component */}
      <Sidebar />

      {/* 4. Main Content Wrapper: flex-1 (mengisi sisa layar), h-screen (agar header sticky berfungsi), overflow-y-auto (scroll independen) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
      
        {/* --- HEADER --- */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
            <Bell size={20} className="text-gray-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        {/* --- MAIN CONTENT BODY --- */}
        <main className="flex-1 p-8">
          
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Mahasiswa</h1>
            <p className="text-gray-600">Tugaskan dosen pembimbing untuk setiap proposal yang sesuai bidangnya.</p>
          </div>

          {/* --- FILTER CARD --- */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              
              {/* Filter: Bidang */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bidang:</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:border-blue-500 font-medium cursor-pointer text-sm">
                    <option>Semua</option>
                    <option>AI</option>
                    <option>Data Science</option>
                    <option>Software Engineering</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Filter: Status */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status:</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:border-blue-500 font-medium cursor-pointer text-sm">
                    <option>Menunggu</option>
                    <option>Diterima</option>
                    <option>Ditolak</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Search Filter Local */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Cari proposal..."
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              {/* Reset Button */}
              <div>
                <button className="h-[42px] px-6 bg-gray-100 text-[#2b5a9e] font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase text-xs tracking-wider">
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* --- TABLE CARD --- */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-gray-200">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Mahasiswa</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">NPM</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Judul</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bidang</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-5 px-6 text-sm text-gray-900 font-bold">{item.nama}</td>
                      <td className="py-5 px-6 text-sm text-gray-500 font-medium">{item.npm}</td>
                      <td className="py-5 px-6 text-sm text-gray-900 font-medium leading-relaxed">{item.judul}</td>
                      <td className="py-5 px-6 text-sm text-gray-600 text-center font-medium">{item.bidang}</td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#FFF7D1] text-[#B45309] rounded-full text-xs font-bold w-fit mx-auto shadow-sm whitespace-nowrap border border-[#FEF08A]">
                          <Hourglass size={12} />
                          <span>{item.status}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <Link href={`detailproposalmahasiswa?id=${item.id}`}>
                          <button className="px-4 py-2 bg-[#9ca3af] hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                            Lihat Detail
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Empty space filler */}
            <div className="h-20 bg-white"></div> 
          </div>

        </main>
      </div>
    </div>
  );
}