"use client";

import React from 'react';
import Sidebar from '@/components/sidebar';
import Link from 'next/link'; // Import Link untuk navigasi
import { 
  Bell, 
  Search, 
  User, 
  FileText,
  ChevronLeft // Import ikon kembali
} from 'lucide-react';

export default function DetailBimbinganPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
            />
          </div>
          <button className="text-gray-400">
            <Bell size={20} />
          </button>
        </header>

        <div className="p-8 max-w-[1300px] mx-auto w-full">
          {/* TOMBOL KEMBALI */}
          <Link 
            href="/bimbinganmahasiswa" 
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors mb-6 w-fit"
          >
            <ChevronLeft size={20} />
            <span>Kembali</span>
          </Link>

          <h1 className="text-xl font-bold text-gray-800 mb-8">Sesi Bimbingan 2</h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* KOLOM KIRI: DETAIL MAHASISWA & UNGGAH (COL SPAN 3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* CARD INFO MAHASISWA & PEMBIMBING */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="flex items-start gap-6 mb-8">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                      <User size={36} className="text-slate-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 leading-tight">Gerald Christopher Andreas</h2>
                      <p className="text-md font-bold text-gray-500 mb-4">140810220014</p>
                      <p className="text-md font-bold text-gray-800 leading-snug">
                        Rancang Bangun Sistem Informasi Manajemen Sidang Skripsi Menggunakan Metode Extreme Programming
                      </p>
                    </div>
                  </div>

                  {/* PEMBIMBING LIST */}
                  <div className="grid grid-cols-1 md:grid-cols-2 border-t border-gray-100">
                    <div className="p-6 border-r border-gray-50">
                      <p className="text-[11px] font-bold text-gray-400 uppercase mb-4">Pembimbing 1</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">Dr. Asep Sholahuddin, MT.</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] font-bold text-gray-400 uppercase mb-4">Pembimbing 2</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">Rudi Rosadi, M.Kom</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD UNGGAH DOKUMEN */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-gray-800">Unggah Dokumen</h3>
                  <button className="bg-[#3b608a] text-white px-6 py-1.5 rounded-lg text-sm font-bold shadow-md">
                    Unggah
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between mb-8 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="text-gray-400" size={24} />
                    <span className="text-sm font-bold text-gray-700">Draft_Sesi_1.docx</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">12 Januari 2024</span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-800">Catatan dari mahasiswa</h4>
                  <textarea 
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none resize-none"
                    placeholder=""
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button className="px-8 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                    Batal
                  </button>
                  <button className="px-8 py-2 bg-[#769391] text-white rounded-lg text-sm font-bold hover:bg-[#68817f] transition">
                    Kirim ke Pembimbing
                  </button>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: KOMENTAR & CATATAN (COL SPAN 1) */}
            <div className="space-y-6">
              
              {/* Catatan Bimbingan Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Catatan Bimbingan</h3>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="text-gray-400 shrink-0" size={18} />
                    <span className="text-[11px] font-bold text-gray-700 truncate">Draft_Perbaikan_1.docx</span>
                  </div>
                  <button className="bg-[#3b608a] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0">
                    Lihat File
                  </button>
                </div>
              </div>

              {/* Komentar Dosen Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Komentar Dosen</h3>
                <div className="border border-gray-200 rounded-xl p-6 min-h-[250px]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                      <User size={18} className="text-slate-400" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Dr. Asep Sholahuddin, MT.</span>
                  </div>
                  <div className="w-full border border-gray-100 h-40 bg-white"></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}