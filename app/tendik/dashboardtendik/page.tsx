"use client";

import React, { useState, useEffect } from 'react';
import SidebarTendik from '@/components/sidebar-tendik'; // Pastikan path ini sesuai lokasi file sidebar Anda
import { 
  FileUp, 
  FileText, 
  Bell, 
  Search, 
  MoreHorizontal, 
  Filter,
  Mail, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle
} from 'lucide-react';

// --- TYPES ---
interface StatCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  trend: string;
  trendColor: string;
}

interface StudentTask {
  name: string;
  npm: string;
  title: string;
  status: string;
  lecturer: string;
}

interface VerificationItem {
  id: number;
  name: string;
  task: string;
  date: string;
}

// --- MAIN COMPONENT ---
export default function DashboardTendik() {
  // State untuk melacak ID baris mana yang dropdown-nya sedang terbuka
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Data Dummy untuk Verifikasi
  const verificationData: VerificationItem[] = [
    { id: 1, name: "Gerald Christopher", task: "Unggah Berita Acara Bimbingan", date: "18 April 2026" },
    { id: 2, name: "Vera Setiawati", task: "Unggah Berita Acara Bimbingan", date: "19 April 2026" },
  ];

  // Handler untuk toggle dropdown
  const toggleDropdown = (id: number) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null); // Tutup jika diklik lagi
    } else {
      setActiveDropdownId(id); // Buka yang baru
    }
  };

  // Handler untuk menutup dropdown ketika klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.verification-menu-container') === null) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-700">
      
      {/* 1. IMPORT SIDEBAR COMPONENT */}
      <SidebarTendik />

      {/* 2. MAIN CONTENT (ml-64 untuk memberi ruang sidebar fixed) */}
      <main className="flex-1 ml-64 min-h-screen">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-6 text-gray-400">
            <Mail size={20} className="cursor-pointer hover:text-blue-600 transition" />
            <div className="relative cursor-pointer hover:text-blue-600 transition">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-[1200px]">
          <h1 className="text-xl font-bold text-gray-800 mb-8">Selamat Datang, Anton</h1>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard 
              icon={<FileUp size={24} className="text-blue-600" />}
              count={12} 
              label="Usulan Judul Baru" 
              trend="5 judul minggu ini" 
              trendColor="text-emerald-500" 
            />
            <StatCard 
              icon={<FileText size={24} className="text-blue-600" />}
              count={26} 
              label="Dokumen Perlu Diverifikasi" 
              trend="20 dokumen minggu ini" 
              trendColor="text-emerald-500" 
            />
            <StatCard 
              icon={<FileText size={24} className="text-blue-600" />}
              count={8} 
              label="Jadwal Seminar Bulan Ini" 
              trend="tetap minggu ini" 
              trendColor="text-orange-300" 
            />
          </div>

          {/* TABLE MANAGEMENT */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
            <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Manajemen Skripsi Mahasiswa</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 cursor-pointer hover:bg-gray-50 shadow-sm">
                  <Filter size={14} />
                  <span>Proses Bimbingan</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                  <input 
                    type="text" 
                    placeholder="Cari Data Mahasiswa" 
                    className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                    <th className="px-6 py-4">Nama Mahasiswa</th>
                    <th className="px-6 py-4 text-center">NPM</th>
                    <th className="px-6 py-4">Judul Skripsi</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Pembimbing</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  <StudentRow 
                    name="Gerald Christopher"
                    npm="140810220014"
                    title="Rancang Bangun Sistem Informasi Manajemen Bidang Skripsi Menggunakan Metode Extreme Programming"
                    status="Disetujui"
                    lecturer="Dr. Juli Rejito, M.Kom"
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* VERIFICATION LIST */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible pb-20">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Verifikasi Berkas</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {verificationData.map((item) => (
                <VerificationRow 
                  key={item.id}
                  item={item}
                  isActive={activeDropdownId === item.id}
                  onToggle={() => toggleDropdown(item.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS (Card, Rows, etc) ---

function StatCard({ icon, count, label, trend, trendColor }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-800">{count}</p>
        <p className="text-sm font-semibold text-gray-600 mt-1">{label}</p>
        <div className={`flex items-center gap-2 mt-3 text-[10px] font-bold ${trendColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {trend}
        </div>
      </div>
    </div>
  );
}

function StudentRow({ name, npm, title, status, lecturer }: StudentTask) {
  return (
    <tr className="hover:bg-gray-50/50 transition">
      <td className="px-6 py-5 font-bold text-gray-800">{name}</td>
      <td className="px-6 py-5 text-center font-medium text-gray-600 text-xs">{npm}</td>
      <td className="px-6 py-5 max-w-xs leading-relaxed text-[13px] font-semibold text-gray-700">{title}</td>
      <td className="px-6 py-5 text-center">
        <span className="px-4 py-1.5 bg-emerald-100 text-emerald-600 text-[10px] uppercase font-bold rounded-full border border-emerald-200">
          {status}
        </span>
      </td>
      <td className="px-6 py-5 font-semibold text-gray-700 text-xs">{lecturer}</td>
      <td className="px-6 py-5 text-center">
        <button className="px-4 py-2 bg-[#9ca3af] text-white text-[11px] font-bold rounded-lg hover:bg-gray-600 transition shadow-sm">
          Lihat Detail
        </button>
      </td>
    </tr>
  );
}

// --- VERIFICATION COMPONENT WITH DROPDOWN LOGIC ---
interface VerificationRowProps {
  item: VerificationItem;
  isActive: boolean;
  onToggle: () => void;
}

function VerificationRow({ item, isActive, onToggle }: VerificationRowProps) {
  return (
    <div className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/30 transition verification-menu-container relative">
      <div className="grid grid-cols-12 w-full items-center gap-4">
        <div className="col-span-3 font-bold text-gray-800">{item.name}</div>
        <div className="col-span-5 font-semibold text-gray-700 text-[13px]">{item.task}</div>
        <div className="col-span-3 font-medium text-gray-500 text-[13px] text-right pr-8">{item.date}</div>
        
        {/* ACTION BUTTON & POPUP */}
        <div className="col-span-1 flex justify-end relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`p-1.5 rounded-full transition ${isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <MoreHorizontal size={24} />
          </button>

          {/* POPUP MENU */}
          {isActive && (
            <div className="absolute right-8 top-0 mt-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1.5 space-y-0.5">
                
                {/* Menu: Lihat Dokumen */}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition text-left">
                  <Eye size={16} className="text-gray-400" />
                  Lihat Dokumen
                </button>

                {/* Menu: Download PDF (Background Abu) */}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 rounded-lg transition text-left mt-1">
                  <Download size={16} className="text-gray-500" />
                  Download PDF
                </button>

                 {/* Menu: Verifikasi (Background Hijau) */}
                 <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-[#15803d] bg-[#f0fdf4] hover:bg-[#dcfce7] rounded-lg transition text-left mt-1">
                  <CheckCircle size={16} className="text-[#15803d]" />
                  Verifikasi
                </button>

                {/* Menu: Tolak (Teks Merah) */}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition text-left">
                  <XCircle size={16} className="text-red-500" />
                  Tolak
                </button>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}