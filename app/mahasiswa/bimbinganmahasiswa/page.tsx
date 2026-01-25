"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import Link from 'next/link'; // Import Link untuk routing
import { 
  Bell, 
  Search, 
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// --- DATA TYPES ---
interface BimbinganRow {
  sesi: string;
  hariTanggal: string;
  waktu: string;
  metodeOrStatus: string; 
  catatanOrPembimbing2: string;
  pembimbing: string;
}

export default function BimbinganPage() {
  const [activeTab, setActiveTab] = useState<'jadwal' | 'riwayat'>('jadwal');

  const jadwalData: BimbinganRow[] = [
    { sesi: "Sesi 2", hariTanggal: "Senin, 13 Januari 2026", waktu: "14:00", metodeOrStatus: "Luring", catatanOrPembimbing2: "Ruang 201", pembimbing: "Dr. Juli Rejito, M.Kom" },
    { sesi: "Sesi 2", hariTanggal: "Selasa, 14 Januari 2026", waktu: "14:00", metodeOrStatus: "Daring", catatanOrPembimbing2: "https://zoom", pembimbing: "Rudi Rosadi, M.Kom" },
  ];

  const riwayatData: BimbinganRow[] = [
    { sesi: "Sesi 1", hariTanggal: "Senin, 06 Januari 2026", waktu: "10:00", metodeOrStatus: "Selesai", catatanOrPembimbing2: "-", pembimbing: "Dr. Juli Rejito, M.Kom" },
  ];

  const currentData = activeTab === 'jadwal' ? jadwalData : riwayatData;

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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition">
            <Bell size={20} />
          </button>
        </header>

        <div className="p-8 max-w-[1200px] mx-auto w-full">
          {/* PROFIL MAHASISWA SECTION */}
          <section className="flex items-start gap-6 mb-10 pb-10 border-b border-gray-100">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
              <User size={44} className="text-slate-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 leading-tight tracking-tight">Gerald Christopher Andreas</h1>
              <p className="text-lg font-bold text-gray-500 mb-6">140810220014</p>
              
              <h2 className="text-xl font-bold text-gray-800 max-w-4xl leading-snug">
                Rancang Bangun Sistem Informasi Manajemen Sidang Skripsi Menggunakan <br /> Metode Extreme Programming
              </h2>
            </div>
          </section>

          {/* TAB NAVIGATION */}
          <div className="flex gap-1 mb-0 relative z-10">
            <button 
              onClick={() => setActiveTab('jadwal')}
              className={`px-10 py-3 text-sm font-bold rounded-t-xl transition-all ${
                activeTab === 'jadwal' 
                ? 'bg-[#f1f1f1] text-gray-800 border-x border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Jadwal Bimbingan
            </button>
            <button 
              onClick={() => setActiveTab('riwayat')}
              className={`px-10 py-3 text-sm font-bold rounded-t-xl transition-all ${
                activeTab === 'riwayat' 
                ? 'bg-[#f1f1f1] text-gray-800 border-x border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Riwayat Bimbingan
            </button>
          </div>

          {/* TABLE AREA */}
          <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] text-[12px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                  <th className="px-8 py-5">Sesi</th>
                  <th className="px-8 py-5">Jadwal Bimbingan</th>
                  <th className="px-8 py-5 text-center">{activeTab === 'jadwal' ? 'Metode Bimbingan' : 'Status'}</th>
                  <th className="px-8 py-5">{activeTab === 'jadwal' ? 'Catatan' : 'Pembimbing 2'}</th>
                  <th className="px-8 py-5">Pembimbing</th>
                  <th className="px-8 py-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-10 font-bold text-gray-800 text-sm align-top">{item.sesi}</td>
                    <td className="px-8 py-10 text-sm align-top">
                      <p className="font-bold text-gray-800 leading-relaxed">{item.hariTanggal}</p>
                      <p className="font-bold text-gray-800">{item.waktu}</p>
                    </td>
                    <td className="px-8 py-10 font-bold text-gray-800 text-sm text-center align-top">
                      {item.metodeOrStatus}
                    </td>
                    <td className="px-8 py-10 text-sm align-top">
                      <span className={item.metodeOrStatus === 'Daring' ? 'text-blue-500 underline cursor-pointer font-bold' : 'font-bold text-gray-800'}>
                        {item.catatanOrPembimbing2}
                      </span>
                    </td>
                    <td className="px-8 py-10 font-bold text-gray-800 text-sm align-top">{item.pembimbing}</td>
                    <td className="px-8 py-10 text-center align-top">
                      {/* ROUTING KE DETAIL BIMBINGAN */}
                      <Link href="/bimbinganmahasiswa/detailbimbingan">
                        <button className="bg-[#a8a8a8] hover:bg-[#969696] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
                          Lihat Detail
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="p-8 flex justify-end">
              <div className="flex items-center gap-1">
                <PaginationButton label="1" active />
                <PaginationButton label="2" />
                <PaginationButton label="3" />
                <PaginationButton label="4" />
                <PaginationButton label="5" />
                <PaginationButton label="6" />
                <PaginationButton icon={<ChevronLeft size={16} />} />
                <PaginationButton icon={<ChevronRight size={16} />} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---
function PaginationButton({ label, icon, active = false }: { label?: string, icon?: React.ReactNode, active?: boolean }) {
  return (
    <button className={`w-8 h-8 flex items-center justify-center rounded border transition-all text-xs font-bold ${
      active 
      ? 'bg-[#c4c4c4] text-gray-800 border-[#c4c4c4]' 
      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
    }`}>
      {label || icon}
    </button>
  );
}