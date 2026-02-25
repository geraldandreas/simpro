"use client";

import React, { useEffect, useState } from "react";
import NotificationBell from '@/components/notificationBell';
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import SidebarTendik from "@/components/sidebar-tendik"; 

import {
  Search,
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  ArrowUpRight,
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  FileText
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// --- OPSI FILTER ---
const FILTER_OPTIONS = [
  "Semua Status",
  "Pengajuan Proposal",
  "Proses Bimbingan",
  "Proses Kesiapan Seminar",
  "Seminar Hasil",
  "Perbaikan Pasca Seminar",
  "Proses Kesiapan Sidang",
  "Sidang Skripsi",
];

interface StudentProgress {
  id: string;
  nama: string;
  npm: string;
  judul: string;
  status: string;
  pembimbing: string;
}

export default function DashboardTendikMain() {
  const [data, setData] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Semua Status"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [userName, setUserName] = useState("Tendik");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        const { data: profile } = await supabase.from("profiles").select("nama").eq("id", auth.user.id).single();
        if (profile) setUserName(profile.nama);
      }

      // 1. Ambil Data Mahasiswa dengan Relasi Lengkap agar sinkron dengan Detail
      const { data: proposals, error } = await supabase
        .from("proposals")
        .select(`
          id, judul, status,
          profiles ( nama, npm ),
          thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
          seminar_requests ( tipe, status, approved_by_p1, approved_by_p2, created_at ),
          sidang_requests ( id, status ),
          seminar_documents ( status ),
          guidance_sessions ( 
            dosen_id, 
            kehadiran_mahasiswa, 
            session_feedbacks ( status_revisi ) 
          )
        `);

      if (error) throw error;

      const mapped: StudentProgress[] = (proposals || []).map((p: any) => {
        // --- LOGIKA DETAILPROGRESTENDIK SINKRONISASI ---
        
        // A. Seminar Request Terbaru (Mencegah data duplikat FALSE)
        const allSeminarReqs = p.seminar_requests || [];
        const activeSeminarReq = allSeminarReqs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] || null;

        // B. Hitung Berkas Tervalidasi
        const docs = p.seminar_documents || [];
        const verifiedDocsCount = docs.filter((d: any) => d.status === 'Lengkap').length;

        // C. Hitung Bimbingan P1 (Utama) & P2 (Pendamping)
        let p1Count = 0;
        let p2Count = 0;
        const sessions = p.guidance_sessions || [];

        p.thesis_supervisors?.forEach((sp: any) => {
          const count = sessions.filter((s: any) => 
            s.dosen_id === sp.dosen_id && 
            s.kehadiran_mahasiswa === 'hadir' &&
            s.session_feedbacks?.[0]?.status_revisi === "disetujui"
          ).length || 0;

          if (sp.role === "utama") p1Count = count;
          else if (sp.role === "pendamping") p2Count = count;
        });

        // D. Cek Kelayakan (isEligible)
        const approvedByAll = !!activeSeminarReq?.approved_by_p1 && !!activeSeminarReq?.approved_by_p2;
        const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

        // E. Cek Data Sidang
        const hasSidang = Array.isArray(p.sidang_requests) && p.sidang_requests.length > 0;

        // F. Panggil Mapper Global
        const ui = mapStatusToUI({
          proposalStatus: p.status,
          hasSeminar: !!activeSeminarReq,
          seminarStatus: activeSeminarReq?.status,
          hasSidang: hasSidang,
          uploadedDocsCount: docs.length,
          verifiedDocsCount: verifiedDocsCount,
          isEligible: isEligible, 
        });

        return {
          id: p.id,
          nama: p.profiles?.nama ?? "-",
          npm: p.profiles?.npm ?? "-",
          judul: p.judul,
          status: ui.label, // Label sekarang sinkron dengan detail progres
          pembimbing: p.thesis_supervisors?.find((s: any) => s.role === "utama")?.profiles?.nama ?? "-",
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

  const filteredData = data.filter((mhs) => {
    const matchStatus = filterStatus === "Semua Status" || mhs.status === filterStatus;
    const matchSearch =
      mhs.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mhs.npm.includes(searchTerm) ||
      mhs.judul.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Pengajuan Proposal": return "bg-amber-100 text-amber-700 border-amber-200"; 
      case "Proses Bimbingan": return "bg-indigo-100 text-indigo-700 border-indigo-200"; 
      case "Proses Kesiapan Seminar":
      case "Proses Kesiapan Sidang": return "bg-blue-100 text-blue-700 border-blue-200"; 
      case "Seminar Hasil":
      case "Sidang Skripsi":
      case "Lulus / Selesai": return "bg-emerald-100 text-emerald-700 border-emerald-200"; 
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <SidebarTendik />
      <div className="flex-1 ml-64 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                 <div className="flex items-center gap-6">
                   <div className="relative w-72 group">
                   </div>
                 </div>
       
               <div className="flex items-center gap-6">
           {/* KOMPONEN LONCENG BARU */}
           <NotificationBell />
           
           <div className="h-8 w-[1px] bg-slate-200 mx-2" />
       
                 <div className="flex items-center gap-6">
                   {/* Minimalist SIMPRO Text */}
                   <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                     Simpro
                   </span>
                 </div>
                 </div>
               </header>
       
        <main className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          
          {/* WELCOME SECTION */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">
                Selamat Datang, {userName.split(' ')[0]}!
              </h1>
              <p className="text-slate-500 font-medium mt-3 tracking-tight">
                Anda memiliki <span className="text-blue-600 font-bold">{filteredData.length} mahasiswa</span> dalam pantauan saat ini.
              </p>
            </div>
            
            {/* QUICK STATS */}
            <div className="flex gap-4">
          
            </div>
          </div>

          {/* TABLE CARD - MANAJEMEN BERKAS */}
          <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
            
            {/* Header Controls */}
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Monitoring Progres Mahasiswa</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manajemen Berkas & Kelayakan</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Search Bar */}
                <div className="relative w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Nama/NPM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Filter */}
                <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white text-slate-700 text-[10px] font-black border border-slate-200 rounded-2xl pl-6 pr-10 py-3.5 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 cursor-pointer appearance-none transition-all min-w-[200px] shadow-sm uppercase tracking-widest"
                  >
                    {FILTER_OPTIONS.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={14} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-6">Mahasiswa</th>
                    <th className="px-8 py-6">Judul Skripsi</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6">Pembimbing</th>
                    <th className="px-8 py-6 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">
                        Sinkronisasi Data Mahasiswa...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-24 text-center">
                         <div className="flex flex-col items-center gap-3 opacity-20">
                            <BookOpen size={60} />
                            <p className="font-black uppercase tracking-widest text-sm">Tidak Ada Antrean</p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((mhs) => (
                      <tr key={mhs.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {mhs.nama.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tighter">{mhs.nama}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1.5 tracking-tighter">{mhs.npm}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <p className="text-[12px] font-bold text-slate-600 leading-relaxed italic line-clamp-2 pr-6">
                            "{mhs.judul}"
                          </p>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadgeStyle(mhs.status)}`}>
                            {mhs.status}
                          </span>
                        </td>
                        <td className="px-8 py-8">
                           <p className="text-[11px] font-black text-slate-700 truncate">{mhs.pembimbing.split(',')[0]}</p>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <Link href={`/tendik/detailprogres?id=${mhs.id}`}>
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                              Lihat Detail <ArrowUpRight size={14} />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Total info */}
            <div className="bg-slate-50/30 px-10 py-6 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Entri: {filteredData.length}
                </p>
                <div className="flex gap-2">
                   <button className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                   <button className="p-2 bg-white border border-slate-200 rounded-lg"><ChevronRight size={16} /></button>
                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}