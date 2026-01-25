"use client";

import React from 'react';
import Sidebar from '@/components/sidebar';
import { 
  Bell, 
  Search, 
  Hourglass, 
  Info
} from 'lucide-react';

export default function JadwalSeminarSidang() {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-700">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition">
            <Bell size={20} />
          </button>
        </header>

        <div className="p-8 max-w-[1200px]">
          {/* JUDUL HALAMAN */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Jadwal Seminar & Sidang</h1>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
              Berikut adalah jadwal seminar dan sidang skripsi yang telah Anda ajukan. Pastikan Anda mempersiapkan diri sebaik mungkin.
            </p>
          </div>

          {/* GRID STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CARD 1: PENGAJUAN SEMINAR HASIL */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Header Card Kuning */}
              <div className="bg-[#ebcf99] p-4 text-center">
                <h2 className="text-lg font-bold text-gray-800">Pengajuan Seminar Hasil</h2>
              </div>
              
              {/* Konten Card */}
              <div className="p-8 flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  <p className="text-md font-bold text-gray-800">Pengajuan seminar hasil sedang diproses.</p>
                  
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <Info size={18} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 leading-relaxed">
                      Mohon tunggu sampai Kaprodi menentukan jadwal seminar Anda. Anda akan mendapatkan notifikasi setelah jadwal seminar ditentukan.
                    </p>
                  </div>
                </div>

                {/* Badge Status Bawah */}
                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 bg-[#f2e2bc] px-4 py-2 rounded-lg border border-[#e6d1a1]">
                    <Hourglass size={16} className="text-[#8a7238]" />
                    <span className="text-xs font-bold text-[#8a7238] uppercase">Menunggu Jadwal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: SIDANG SKRIPSI */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Header Card Abu-abu */}
              <div className="bg-[#f1f1f1] p-4 text-center border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Sidang Skripsi</h2>
              </div>
              
              {/* Konten Card */}
              <div className="p-8 flex-1">
                <p className="text-sm font-bold text-gray-400">Belum diajukan</p>
                {/* Garis pemisah bawah tipis seperti di gambar */}
                <div className="mt-24 border-t border-gray-100 w-full"></div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}