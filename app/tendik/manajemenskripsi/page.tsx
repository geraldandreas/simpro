"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  BookOpen,
  ArrowRight,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import SidebarTendik from "@/components/sidebar-tendik";

// --- OPSI FILTER ---
const FILTER_OPTIONS = [
  "Semua Status",
  "Pengajuan Proposal",
  "Proses Bimbingan",
  "Proses Kesiapan Seminar",
  "Seminar Proposal",
  "Perbaikan Pasca Seminar",
  "Proses Kesiapan Sidang",
  "Sidang Skripsi",
  "Perbaikan Pasca Sidang",
  "Lulus / Selesai",
];

// --- TIPE DATA ---
interface StudentProgress {
  id: string;
  nama: string;
  npm: string;
  judul: string;
  status: string;
  pembimbing: string;
}

export default function ManajemenSkripsiTendikPage() {
  const [data, setData] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Semua Status"); 
  const [searchTerm, setSearchTerm] = useState("");

  // ================= FETCH DATA (Backend Logic Tetap) =================
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: proposals, error } = await supabase
        .from("proposals")
        .select(`
          id, judul, status,
          profiles ( nama, npm ),
          thesis_supervisors ( profiles ( nama ) ),
          seminar_requests ( tipe, status )
        `);

      if (error) throw error;

      const mapped: StudentProgress[] = (proposals || []).map((p: any) => {
        let timelineStatus = "Pengajuan Proposal";
        if (p.thesis_supervisors?.length > 0) timelineStatus = "Proses Bimbingan";

        const seminar = p.seminar_requests?.find((s: any) => s.tipe === "seminar");
        const sidang = p.seminar_requests?.find((s: any) => s.tipe === "sidang");

        if (seminar) {
          if (seminar.status === "draft" || seminar.status === "Lengkap" || seminar.status === "Menunggu Verifikasi" || seminar.status === "Menunggu Penjadwalan") timelineStatus = "Proses Kesiapan Seminar";
          if (seminar.status === "Dijadwalkan" || seminar.status === "Selesai") timelineStatus = "Seminar Proposal";
          if (seminar.status === "Ditolak") timelineStatus = "Perbaikan Pasca Seminar";
        }
        if (sidang) {
          if (sidang.status === "draft" || sidang.status === "Lengkap" || sidang.status === "Menunggu Verifikasi") timelineStatus = "Proses Kesiapan Sidang";
          if (sidang.status === "Dijadwalkan" || sidang.status === "Selesai") timelineStatus = "Sidang Skripsi";
        }

        return {
          id: p.id,
          nama: p.profiles?.nama ?? "-",
          npm: p.profiles?.npm ?? "-",
          judul: p.judul,
          status: timelineStatus,
          pembimbing: p.thesis_supervisors?.[0]?.profiles?.nama ?? "-",
        };
      });
      setData(mapped);
    } catch (err) {
      console.error("❌ Gagal fetch progres:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ================= FILTER LOGIC (Backend Logic Tetap) =================
  const filteredData = data.filter((mhs) => {
    const matchStatus = filterStatus === "Semua Status" || mhs.status === filterStatus;
    const matchSearch = mhs.nama.toLowerCase().includes(searchTerm.toLowerCase()) || mhs.npm.includes(searchTerm) || mhs.judul.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ================= HELPER WARNA BADGE =================
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Pengajuan Proposal": return "bg-amber-100 text-amber-700 border-amber-200"; 
      case "Proses Bimbingan": return "bg-indigo-100 text-indigo-700 border-indigo-200"; 
      case "Proses Kesiapan Seminar":
      case "Proses Kesiapan Sidang": return "bg-blue-100 text-blue-700 border-blue-200"; 
      case "Seminar Proposal":
      case "Sidang Skripsi":
      case "Lulus / Selesai": return "bg-emerald-100 text-emerald-700 border-emerald-200"; 
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <SidebarTendik />

      <div className="flex-1 ml-64 flex flex-col h-full">
        
        {/* --- HEADER (Clean - No Search/Blue Avatar) --- */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                          <div className="flex items-center gap-6">
                            <div className="relative w-72 group">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                              <input 
                                type="text" 
                                placeholder="Cari data..." 
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-xs outline-none transition-all shadow-inner uppercase tracking-widest"
                              />
                            </div>
                          </div>
                
                          <div className="flex items-center gap-6">
                            {/* Minimalist SIMPRO Text */}
                            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                              Simpro
                            </span>
                          </div>
                        </header>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 p-10 overflow-y-auto">
          
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Progres Skripsi</h1>
              <p className="text-slate-500 font-medium mt-1">Pantau perkembangan akademik mahasiswa secara real-time.</p>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
            
            {/* Header Controls (Filter & Local Search) */}
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <LayoutDashboard size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Daftar Progres Mahasiswa</h2>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari nama atau npm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white text-slate-700 text-sm font-bold border border-slate-200 rounded-2xl pl-12 pr-4 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all w-64 shadow-sm"
                    />
                </div>
                <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white text-slate-700 text-sm font-black border border-slate-200 rounded-2xl pl-12 pr-10 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 cursor-pointer appearance-none transition-all min-w-[200px] shadow-sm"
                  >
                    {FILTER_OPTIONS.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table dengan Spacing Proporsional */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-6 w-[22%]">Informasi Mahasiswa</th>
                    <th className="px-8 py-6 w-[33%]">Judul Skripsi</th>
                    <th className="px-8 py-6 text-center w-[18%]">Status Timeline</th>
                    <th className="px-8 py-6 w-[17%]">Pembimbing</th>
                    <th className="px-8 py-6 text-center w-[10%]">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse">
                        Menghubungkan ke database...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                         <div className="flex flex-col items-center gap-3">
                            <BookOpen className="text-slate-100" size={60} />
                            <p className="text-slate-400 font-black uppercase tracking-widest">Data Tidak Ditemukan</p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((mhs) => (
                      <tr key={mhs.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                        {/* 1. INFORMASI MAHASISWA */}
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                              {mhs.nama.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tighter">{mhs.nama}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1.5 tracking-tighter">{mhs.npm}</p>
                            </div>
                          </div>
                        </td>

                        {/* 2. JUDUL SKRIPSI (Lebar untuk menutup gap) */}
                        <td className="px-8 py-8">
                          <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 italic pr-6">
                            "{mhs.judul}"
                          </p>
                        </td>

                        {/* 3. STATUS TIMELINE */}
                        <td className="px-8 py-8 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadgeStyle(mhs.status)}`}>
                            {mhs.status}
                          </span>
                        </td>

                        {/* 4. PEMBIMBING */}
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-2">
                             <User size={14} className="text-blue-500 shrink-0" />
                             <p className="text-xs font-black text-slate-700 truncate">{mhs.pembimbing}</p>
                          </div>
                        </td>

                        {/* 5. AKSI */}
                        <td className="px-8 py-8 text-center">
                          <Link href={`/tendik/detailprogres?id=${mhs.id}`}>
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                              DETAIL <ArrowRight size={14} />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-slate-50/30 px-10 py-6 flex items-center justify-between border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Menampilkan {filteredData.length} dari {data.length} Mahasiswa
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                   <button className="w-10 h-10 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 text-xs">1</button>
                   <button className="w-10 h-10 bg-white border border-slate-200 text-slate-400 font-black rounded-xl hover:bg-slate-50 text-xs">2</button>
                </div>
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}