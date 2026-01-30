"use client";

import React from 'react';
import { 
  Bell, 
  Search, 
  ChevronDown, 
  MessageSquare, 
  Users, 
  FileCheck, 
  Clock, 
  GraduationCap,
  ArrowUpRight,
  Filter
} from 'lucide-react';

export default function DashboardKaprodi() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FE] pb-12 font-sans text-slate-700">
      
      {/* TOP HEADER - Glassmorphism Effect */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20">
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari mahasiswa atau dokumen..." 
            className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-sm outline-none transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center gap-5">
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
            <MessageSquare size={22} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 ml-2 uppercase">A</div>
        </div>
      </header>

      <main className="p-10 max-w-[1400px] w-full mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Selamat Datang, Dr. Akmal, S.Si</h1>
          <p className="text-slate-500 font-medium mt-1">Pantau perkembangan akademik dan bimbingan mahasiswa Anda hari ini.</p>
        </div>

        {/* STATS CARDS - Improved with Icons & Depth */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <StatCard count="5" label="Mahasiswa" subLabel="Bimbingan Aktif" icon={<Users size={20} />} color="blue" />
          <StatCard count="4" label="Proposal" subLabel="Menunggu Review" icon={<FileCheck size={20} />} color="amber" />
          <StatCard count="1" label="Seminar" subLabel="Siap Dijadwalkkan" icon={<Clock size={20} />} color="indigo" />
          <StatCard count="10" label="Skripsi" subLabel="Dalam Pengerjaan" icon={<GraduationCap size={20} />} color="emerald" />
        </div>

        {/* TABLE SECTION - Improved Spacing & Design */}
        <section className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                <Users size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Mahasiswa Bimbingan Aktif</h2>
            </div>
            <div className="flex gap-3">
               <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-black border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                  <Filter size={14} />
                  URUTKAN
               </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  <th className="px-8 py-6 w-[30%]">Mahasiswa</th>
                  <th className="px-8 py-6 text-center w-[15%]">NPM</th>
                  <th className="px-8 py-6 text-center w-[25%]">Status Progres</th>
                  <th className="px-8 py-6 w-[20%]">Pembimbing Pendamping</th>
                  <th className="px-8 py-6 text-center w-[10%]">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <TableRow 
                  name="Gerald Christopher Andreas" npm="140810220014" lecturer2="Dr. Juli Rejito, M.Kom"
                  status="Proses Kesiapan Seminar" statusColor="bg-blue-100 text-blue-700 border-blue-200" 
                />
                <TableRow 
                  name="Vera Setiawati" npm="140810220013" lecturer2="-"
                  status="Pengajuan Proposal" statusColor="bg-amber-100 text-amber-700 border-amber-200" 
                />
                <TableRow 
                  name="Dobi Nugraha" npm="140810220012" lecturer2="Rudi Rosadi, M.Kom"
                  status="Proses Bimbingan" statusColor="bg-emerald-100 text-emerald-700 border-emerald-200" 
                />
              </tbody>
            </table>
          </div>
          
          {/* Footer rekap yang lebih subtle */}
          <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex justify-center">
            <button className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 transition-colors group">
              Lihat Seluruh Rekap Progres Skripsi 
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- IMPROVED SUB-COMPONENTS ---

function StatCard({ count, label, subLabel, icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-white shadow-lg shadow-slate-200/50 flex flex-col items-center text-center hover:translate-y-[-4px] transition-all duration-300 group">
      <div className={`p-4 rounded-2xl mb-6 border ${colors[color]} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{count}</span>
      <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{label}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">● {subLabel}</p>
    </div>
  );
}

function TableRow({ name, npm, status, lecturer2, statusColor }: any) {
  return (
    <tr className="hover:bg-blue-50/30 transition-all duration-300 group">
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            {name.charAt(0)}
          </div>
          <p className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">{name}</p>
        </div>
      </td>
      <td className="px-8 py-6 text-center font-bold text-slate-400 text-xs tracking-tighter">{npm}</td>
      <td className="px-8 py-6 text-center">
        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-8 py-6">
        <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{lecturer2}</p>
      </td>
      <td className="px-8 py-6 text-center">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95">
          DETAIL
        </button>
      </td>
    </tr>
  );
}