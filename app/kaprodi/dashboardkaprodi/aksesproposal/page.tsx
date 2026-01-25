"use client";

import React from "react";
import Link from "next/link"; // 1. Import Link Next.js
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
     <div className="min-h-screen bg-[#F8F9FB]">
      
       <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
                />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
          <Bell size={20} className="text-gray-400" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="p-8">
        
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
              <label className="block text-lg font-semibold text-gray-900 mb-3">Bidang:</label>
              <div className="relative">
                <select className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-blue-500 font-medium cursor-pointer">
                  <option>Semua</option>
                  <option>AI</option>
                  <option>Data Science</option>
                  <option>Software Engineering</option>
                </select>
                <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Filter: Status */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-lg font-semibold text-gray-900 mb-3">Status:</label>
              <div className="relative">
                <select className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-blue-500 font-medium cursor-pointer">
                  <option>Menunggu</option>
                  <option>Diterima</option>
                  <option>Ditolak</option>
                </select>
                <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Search Filter Local */}
            <div className="flex-1 min-w-[200px]">
               <div className="relative">
                <input 
                  type="text" 
                  className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
                <Search className="absolute right-3 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            {/* Reset Button */}
            <div>
              <button className="h-[46px] px-8 bg-gray-100 text-[#2b5a9e] font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase text-sm tracking-wider">
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
                  <th className="py-4 px-6 text-sm font-bold text-gray-700">Nama Mahasiswa</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-700">NPM</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-700 w-1/3">Judul</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-700 text-center">Bidang</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-700 text-center">Status</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-700 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-5 px-6 text-sm text-gray-900 font-medium">{item.nama}</td>
                    <td className="py-5 px-6 text-sm text-gray-900 font-medium">{item.npm}</td>
                    <td className="py-5 px-6 text-sm text-gray-900 font-medium leading-relaxed">{item.judul}</td>
                    <td className="py-5 px-6 text-sm text-gray-900 text-center">{item.bidang}</td>
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FDE68A] text-[#92400E] rounded-full text-xs font-semibold w-fit mx-auto shadow-sm">
                        <Hourglass size={14} />
                        <span>{item.status}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
  <Link href={`detailproposal?id=${item.id}`}>
    <button className="px-5 py-2.5 bg-[#8C8C8C] text-white text-xs font-bold rounded-lg hover:bg-gray-600 transition-colors shadow-sm cursor-pointer">
      Lihat Detail
    </button>
  </Link>
</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="h-40"></div> 
        </div>

      </main>
    </div>
  );
}