"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import NotificationBell from '@/components/notificationBell';
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import Image from "next/image";

import {
  Search,
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  BookOpen,
  ArrowUpRight,
  LayoutDashboard,
  ArrowRight,
  FileText
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// --- OPSI FILTER ---
const FILTER_OPTIONS = [
  "Semua Status",
  "Pengajuan Proposal",
  "Proses Bimbingan",
  "Persetujuan Seminar",
  "Unggah Dokumen Seminar",
  "Verifikasi Berkas",
  "Seminar Hasil",
  "Perbaikan Pasca Seminar",
  "Pendaftaran Sidang Skripsi",
  "Sidang Skripsi",
];

// --- TIPE DATA ---
interface StudentProgress {
  id: string;
  nama: string;
  npm: string;
  judul: string;
  status: string;
  pembimbing: string;
  avatar_url?: string | null;
}

// ================= FETCHER SWR =================
const fetchDashboardTendikData = async () => {
  let fetchedUserName = "";
  const { data: auth } = await supabase.auth.getUser();
  
  if (auth?.user) {
    const { data: profile } = await supabase.from("profiles").select("nama").eq("id", auth.user.id).single();
    if (profile) fetchedUserName = profile.nama;
  }

  const { data: proposals, error } = await supabase
    .from("proposals")
    .select(`
      id, judul, status, status_lulus,
      profiles ( nama, npm, avatar_url ),
      thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
      seminar_requests ( 
        id, tipe, status, approved_by_p1, approved_by_p2, created_at,
        seminar_feedbacks ( status_revisi ),
        examiners ( dosen_id )
      ),
      sidang_requests ( id, status ),
      seminar_documents ( status ),
      guidance_sessions ( 
        dosen_id, 
        kehadiran_mahasiswa, 
        session_feedbacks ( status_revisi ) 
      )
    `)
    .eq('status_lulus', false) 
    .order('created_at', { ascending: false });

  if (error) throw error;

  const mappedData: StudentProgress[] = (proposals || []).map((p: any) => {
    const allSeminarReqs = p.seminar_requests || [];
    const activeSeminarReq = allSeminarReqs.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] || null;

    const docs = p.seminar_documents || [];
    const verifiedDocsCount = docs.filter((d: any) => d.status === 'Lengkap').length;

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

    const approvedByAll = !!activeSeminarReq?.approved_by_p1 && !!activeSeminarReq?.approved_by_p2;
    let isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;
    if (docs.length > 0 || activeSeminarReq) isEligible = true;

    const hasSidang = Array.isArray(p.sidang_requests) && p.sidang_requests.length > 0;

    const ui = mapStatusToUI({
      proposalStatus: p.status,
      hasSeminar: !!activeSeminarReq,
      seminarStatus: activeSeminarReq?.status,
      hasSidang: hasSidang,
      uploadedDocsCount: docs.length,
      verifiedDocsCount: verifiedDocsCount,
      isEligible: isEligible, 
    });

    let finalTahap = ui.label;

    if (p.status_lulus === true || p.status === 'Lulus') {
      finalTahap = "Lulus";
    } else {
      if (activeSeminarReq) {
        const fbs = activeSeminarReq.seminar_feedbacks || [];
        const exms = activeSeminarReq.examiners || [];
        const totalDosen = exms.length + (p.thesis_supervisors?.length || 0);
        const totalAcc = fbs.filter((f: any) => f.status_revisi === 'diterima').length;
        
        const hasFeedback = fbs.length > 0;
        const isAllRevisiAcc = totalDosen > 0 && totalAcc >= totalDosen;

        if (activeSeminarReq.status === 'Selesai' || hasFeedback) {
          finalTahap = "Perbaikan Pasca Seminar"; 
          if (isAllRevisiAcc) finalTahap = "Pendaftaran Sidang Akhir";
        }
      }

     if (hasSidang) {
         const sidangStatus = p.sidang_requests[0]?.status?.toLowerCase();
         
         if (sidangStatus === 'lulus') {
           finalTahap = "Lulus";
         } 
         else if (sidangStatus === "menunggu_penjadwalan" || sidangStatus === "pending") {
           finalTahap = "Pendaftaran Sidang Skripsi";
         } 
         else {
           finalTahap = "Sidang Skripsi";
         }
      }
    }

    return {
      id: p.id,
      nama: p.profiles?.nama ?? "-",
      npm: p.profiles?.npm ?? "-",
      avatar_url: p.profiles?.avatar_url || null,
      judul: p.judul,
      status: finalTahap, 
      pembimbing: p.thesis_supervisors?.find((s: any) => s.role === "utama")?.profiles?.nama ?? "-",
    };
  });

  return { mappedData, fetchedUserName };
};


export default function DashboardTendikMain() {
  // 🚀 IMPLEMENTASI SWR DENGAN REFRESH OTOMATIS
  const { data: fetchResult, isLoading } = useSWR(
    'dashboard_tendik_main', 
    fetchDashboardTendikData, 
    {
      revalidateOnFocus: true, // Refresh otomatis saat kembali ke tab ini
      refreshInterval: 60000   // Auto-refresh tiap 1 menit
    }
  );

  const data = fetchResult?.mappedData || [];
  const userName = fetchResult?.fetchedUserName || "";

  const [filterStatus, setFilterStatus] = useState("Semua Status"); 
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchTerm]);

  // ================= FILTER LOGIC =================
  const filteredData = data.filter((mhs) => {
    const matchStatus = filterStatus === "Semua Status" || mhs.status === filterStatus;
    const matchSearch =
      mhs.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mhs.npm.includes(searchTerm) ||
      mhs.judul.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // ================= HELPER WARNA BADGE =================
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Pengajuan Proposal": return "bg-amber-100 text-amber-700 border-amber-200"; 
      case "Proses Bimbingan": return "bg-indigo-100 text-indigo-700 border-indigo-200"; 
      case "Persetujuan Seminar": return "bg-purple-100 text-purple-700 border-purple-200"; 
      case "Unggah Dokumen Seminar": return "bg-green-100 text-green-700 border-green-200";
      case "Verifikasi Berkas": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Seminar Hasil": return "bg-green-100 text-green-700 border-green-200";
      case "Perbaikan Pasca Seminar": return "bg-orange-100 text-orange-700 border-orange-200"; 
      case "Pendaftaran Sidang Skripsi": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Sidang Skripsi":
      case "Lulus": return "bg-emerald-100 text-emerald-700 border-emerald-200"; 
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#F8F9FB] font-sans text-slate-700">

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-10 overflow-y-auto outline-none focus:outline-none">
        
        <div className="mb-10 outline-none focus:outline-none">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Selamat Datang,</h1>
          {isLoading && !fetchResult ? (
            <div className="h-9 w-64 bg-blue-100 rounded-2xl animate-pulse mt-2"></div>
          ) : (
            <p className="text-blue-600 text-3xl font-black tracking-tight mt-2">{userName.split(' ')[0] || "Tenaga Kependidikan"}.</p>
          )}
          <p className="text-slate-500 font-medium mt-3">Anda memiliki <span className="text-blue-600 font-bold">{filteredData.length} mahasiswa</span> dalam pantauan saat ini.</p>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden outline-none focus:outline-none">
          
          {/* 🔥 HEADER CONTROLS 🔥 */}
          <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                <LayoutDashboard size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Mahasiswa</h2>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Filter Dropdown */}
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 group-focus-within:scale-110 transition-transform" size={16} />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white text-slate-700 text-sm font-black border border-slate-200 rounded-2xl pl-12 pr-10 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 cursor-pointer appearance-none transition-all min-w-[240px] shadow-sm"
                >
                  {FILTER_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
              </div>

              {/* Local Search */}
              <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari Nama/NPM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto outline-none focus:outline-none">
            <table className="w-full text-left border-collapse outline-none focus:outline-none">
             <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  <th className="px-8 py-6 w-[22%]">Mahasiswa</th>
                  <th className="px-8 py-6 text-center w-[33%]">Judul Skripsi</th>
                  <th className="px-8 py-6 text-center w-[18%]">Status Timeline</th>
                  <th className="px-8 py-6 text-center w-[17%]">Pembimbing</th>
                  <th className="px-8 py-6 text-center w-[10%]">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 outline-none focus:outline-none">
                {isLoading && !fetchResult ? (
                  <>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <tr key={item} className="border-b border-slate-50 outline-none focus:outline-none">
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                            <div className="flex flex-col gap-2 flex-1">
                              <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                              <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="flex flex-col items-center gap-2 animate-pulse px-6">
                            <div className="h-2.5 w-full max-w-[220px] bg-slate-200 rounded-full"></div>
                            <div className="h-2.5 w-3/4 max-w-[160px] bg-slate-100 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="h-6 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="flex flex-col items-center gap-2 animate-pulse">
                            <div className="h-2.5 w-28 bg-slate-200 rounded-full"></div>
                            <div className="h-2.5 w-24 bg-slate-100 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <BookOpen className="text-slate-100" size={60} />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Data Tidak Ditemukan</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((mhs) => (
                    <tr key={mhs.id} className="group hover:bg-blue-50/30 transition-all duration-300 outline-none focus:outline-none">
                      
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all relative overflow-hidden shrink-0 border border-slate-200">
                            {mhs.avatar_url ? (
                              <Image 
                                src={mhs.avatar_url} 
                                alt={mhs.nama} 
                                layout="fill" 
                                objectFit="cover" 
                              />
                            ) : (
                              mhs.nama.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tighter">{mhs.nama}</p>
                            <p className="text-[10px] text-slate-400 font-black tracking-widest">{mhs.npm}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-8 text-center">
                        <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 px-6">
                          "{mhs.judul}"
                        </p>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadgeStyle(mhs.status)}`}>
                          {mhs.status}
                        </span>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-2 justify-center">
                           <User size={14} className="text-blue-500 shrink-0" />
                           <p className="text-xs font-black text-slate-700 truncate">{mhs.pembimbing}</p>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <Link href={`/tendik/detailprogres?id=${mhs.id}`}>
                          <button className="group/btn inline-flex justify-center items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 outline-none focus:outline-none focus:ring-0">
                            DETAIL <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 🔥 PAGINATION 🔥 */}
          <div className="bg-slate-50/30 px-10 py-6 flex items-center justify-between border-t border-slate-100 outline-none focus:outline-none">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Mahasiswa: {filteredData.length} Data
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex gap-1">
                 {[...Array(totalPages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentPage(i + 1)} 
                      className={`w-10 h-10 font-black rounded-xl text-xs outline-none focus:outline-none transition-colors ${
                        currentPage === i + 1 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                 ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}