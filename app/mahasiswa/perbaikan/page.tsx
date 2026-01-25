"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import { 
  CloudUpload, 
  FileText, 
  CheckCircle2, 
  Search,
  Bell
} from 'lucide-react';

export default function PerbaikanPascaSeminar() {
  const [isUploaded, setIsUploaded] = useState(true);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex font-sans text-slate-700">
      <Sidebar />
      
      <main className="flex-1 ml-64 transition-all duration-300">
        {/* TOP HEADER */}
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

        <div className="p-8 max-w-[1200px] mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-800">Unggah Perbaikan Pasca Seminar</h1>
            <p className="text-sm text-gray-400 mt-1">Unggah dokumen perbaikan Anda di sini.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* AREA UPLOAD (KIRI) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                <div className="bg-[#5da8f5] p-6 rounded-full mb-6">
                  <CloudUpload size={48} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-700 leading-tight">Drag & drop file disini, atau</h2>
                <button className="mt-4 bg-[#345d8a] text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-[#2a4a6e] transition">
                  Pilih File
                </button>
                <p className="mt-4 text-xs text-gray-400 font-medium">Format PDF</p>
              </div>

              {/* Status Unggah Berhasil */}
              {isUploaded && (
                <div className="space-y-4">
                  <div className="bg-[#e8f3f0] p-4 rounded-xl border border-[#d1e7e0] flex items-center gap-4">
                    <CheckCircle2 className="text-[#56a78a]" size={28} />
                    <div>
                      <p className="font-bold text-gray-800 leading-none text-sm">Unggah Berhasil</p>
                      <p className="text-xs text-gray-500 mt-1">File Anda berhasil diunggah.</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={24} />
                      <span className="text-sm font-semibold text-gray-700">Perbaikan_Gerald_Christopher.pdf</span>
                    </div>
                    <button className="bg-[#e24c3d] text-white px-5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition shadow-sm">
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DETAIL & AKSI (KANAN) */}
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Detail File</h2>
                <div className="space-y-4">
                  <DetailItem label="Nama File" value="" />
                  <DetailItem label="Tanggal Diunggah" value="" />
                  <div className="flex items-start text-[12px] font-bold">
                    <span className="w-32 text-gray-800">Status</span>
                    <span className="text-gray-400 mr-2">:</span>
                    <span className="bg-[#f0f9f6] text-[#56a78a] px-3 py-0.5 rounded-full border border-[#d1e7e0] text-[10px]">
                      Diterima
                    </span>
                  </div>
                </div>
              </section>

              {/* Tombol Aksi Utama */}
              <button className="w-full bg-[#345d8a] text-white py-3.5 rounded-lg text-sm font-bold shadow-md hover:bg-[#2a4a6e] transition">
                Ajukan Sidang Skripsi
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Komponen Helper
function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-start text-[12px] font-bold">
      <span className="w-32 text-gray-800">{label}</span>
      <span className="text-gray-400 mr-2">:</span>
      <span className="flex-1 text-gray-700">{value}</span>
    </div>
  );
}