"use client";

import React from 'react';
import { Bell, Search, ChevronDown, MessageSquare } from 'lucide-react';

export default function DashboardKaprodi() {
  // Data Grafik dengan Warna Persis Referensi
  const chartData = [
    { label: ['Usulan', 'Proposal'], value: 5, color: 'bg-[#EBCF99]' },    // Kuning Emas
    { label: ['Proses', 'Bimbingan'], value: 10, color: 'bg-[#B6CDC1]' },  // Hijau Sage
    { label: ['Persiapan', 'Seminar'], value: 5, color: 'bg-[#84A6D1]' },  // Biru Ungu
    { label: ['Siap', 'Sidang'], value: 3, color: 'bg-[#A8C7E0]' },       // Biru Langit
    { label: ['Selesai', ''], value: 3, color: 'bg-[#5B84B1]' },           // Biru Tua
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] pb-12 font-sans text-slate-700">
      
      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-5 text-gray-400">
          <MessageSquare size={20} className="cursor-pointer hover:text-blue-600 transition" />
          <div className="relative cursor-pointer hover:text-blue-600 transition">
            <Bell size={20} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-[1250px] w-full mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-8 tracking-tight">Selamat Datang, Dr. Akmal, S.Si</h1>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard count="5" label="Mahasiswa" subLabel="Bimbingan" />
          <StatCard count="4" label="Proposal" subLabel="Menunggu Persetujuan" />
          <StatCard count="1" label="Menunggu" subLabel="Persetujuan Seminar" />
          <StatCard count="10" label="Mahasiswa" subLabel="Dalam Proses Skripsi" />
        </div>

        {/* CHART SECTION */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 p-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-lg font-bold text-gray-900">Progress Skripsi Mahasiswa</h2>
            <div className="flex gap-3">
              <FilterDropdown label="Januari" />
              <FilterDropdown label="2026" />
            </div>
          </div>

          {/* Area Chart */}
          <div className="relative h-[250px] w-full px-4 mb-4">
            {/* Grid Lines (Background) */}
            <div className="absolute inset-0 flex flex-col justify-between h-[200px] z-0">
              {[15, 10, 5, 0].map((val, i) => (
                <div key={i} className="w-full border-t border-gray-100 relative">
                  <span className="absolute -left-6 -top-2 text-xs font-medium text-gray-400">{val}</span>
                </div>
              ))}
            </div>

            {/* Bars Container */}
            <div className="relative h-[200px] flex items-end justify-around z-10 pl-4 pr-4">
              {chartData.map((data, idx) => (
                <div key={idx} className="flex flex-col items-center w-16 group">
                  {/* Value Number */}
                  <span className="mb-2 text-sm font-bold text-gray-800 transition-all group-hover:-translate-y-1">
                    {data.value}
                  </span>
                  
                  {/* The Bar */}
                  <div 
                    className={`${data.color} w-12 rounded-t-[4px] transition-all duration-700 hover:brightness-110`}
                    style={{ height: `${(data.value / 15) * 100}%` }}
                  ></div>
                  
                  {/* X-Axis Labels (Two Lines) */}
                  <div className="mt-4 flex flex-col items-center text-center h-10 justify-start">
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">{data.label[0]}</span>
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">{data.label[1]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer Button - DIUBAH SESUAI REFERENSI */}
          <div className="mt-6">
            <button className="w-full py-3 bg-[#F3F4F6] text-[#2563EB] text-[11px] font-bold rounded-lg hover:bg-gray-200 transition">
              Lihat Rekap Progres Skripsi
            </button>
          </div>
        </section>

        {/* TABLE SECTION - DIUBAH SESUAI REFERENSI */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Mahasiswa Bimbingan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F9FAFB] border-b border-gray-200">
                <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-4">Nama Mahasiswa</th>
                  <th className="px-6 py-4">NPM</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Pembimbing 2</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <TableRow 
                  name="Gerald Christopher Andreas" npm="140810220014" lecturer2="Dr. Juli Rejito, M.Kom"
                  status="Proses Kesiapan Seminar" statusColor="bg-[#84A6D1]" // Biru Ungu
                />
                <TableRow 
                  name="Vera Setiawati" npm="140810220013" lecturer2="-"
                  status="Pengajuan Proposal" statusColor="bg-[#EBCF99]" // Kuning Emas
                />
                <TableRow 
                  name="Dobi Nugraha" npm="140810220012" lecturer2="Rudi Rosadi, M.Kom"
                  status="Proses Bimbingan" statusColor="bg-[#B6CDC1]" // Hijau Sage
                />
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ count, label, subLabel }: { count: string, label: string, subLabel: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:translate-y-[-2px] transition-transform duration-200">
      <span className="text-4xl font-bold text-gray-900 mb-2">{count}</span>
      <p className="text-sm font-bold text-gray-800 leading-tight">{label}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-1">{subLabel}</p>
    </div>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3F4F6] border border-gray-200 rounded-md text-[10px] font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition">
      {label} <ChevronDown size={12} />
    </div>
  );
}

function TableRow({ name, npm, status, lecturer2, statusColor }: any) {
  return (
    <tr className="hover:bg-gray-50 transition text-[13px] font-semibold text-gray-800">
      <td className="px-6 py-5 font-bold">{name}</td>
      <td className="px-6 py-5 font-medium text-gray-500">{npm}</td>
      <td className="px-6 py-5 text-center">
        {/* Status Badge berbentuk Pil (rounded-full) */}
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold text-white inline-block shadow-sm ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-5 font-bold text-gray-700">{lecturer2}</td>
      <td className="px-6 py-5 text-center">
        {/* Tombol Aksi Hijau */}
        <button className="px-5 py-2 bg-[#67A38A] text-white text-[10px] font-bold rounded-md hover:bg-[#578c75] transition shadow-sm">
          Lihat Detail
        </button>
      </td>
    </tr>
  );
}