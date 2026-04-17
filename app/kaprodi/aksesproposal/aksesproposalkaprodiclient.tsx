"use client";

import React, { useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import Link from "next/link";
import Image from "next/image";
import { 
  Search, 
  Filter, 
  FileText, 
  Activity,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface ProposalItem {
  id: string;
  judul: string;
  bidang: string;
  status: string;
  status_lulus?: boolean;
  isRecommendedForMe?: boolean;
  hasResponded?: boolean;
  isRejectedByDosen?: boolean;
  isReadyToAssign?: boolean;
  user: {
    nama: string | null;
    npm: string | null;
    avatar_url?: string | null;
  };
}

// ================= FETCHER SWR =================
const fetchProposalsData = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id || null;

  if (!userId) return { userId: null, proposals: [] };

  const { data: propData, error: propError } = await supabase
    .from("proposals")
    .select(`
      id, judul, bidang, status, status_lulus,
      user:profiles ( nama, npm, avatar_url ),
      proposal_recommendations ( dosen_id ),
      thesis_supervisors ( dosen_id, status )
    `)
    .order("created_at", { ascending: false });

  if (propError) throw propError;

  const mappedData: ProposalItem[] = (propData as any[]).map(p => {
    // Cek apakah Kaprodi yang sedang login ada di rekomendasi
    const isRecommended = p.proposal_recommendations?.some((r: any) => r.dosen_id === userId);
    
    // Cek apakah Kaprodi sudah merespon (sudah masuk ke thesis_supervisors)
    const alreadyResponded = p.thesis_supervisors?.some((s: any) => s.dosen_id === userId);
    
    // Logika deteksi penolakan
    const hasRejection = p.thesis_supervisors?.some((s: any) => s.status === 'rejected');

    // Logika Siap Ditetapkan (Minimal 2 Dosen Menerima & Status Belum Diterima)
    const acceptedCount = p.thesis_supervisors?.filter((s: any) => s.status === 'accepted').length;
    const ready = acceptedCount >= 2 && p.status !== "Diterima";

    return {
      ...p,
      isRecommendedForMe: isRecommended,
      hasResponded: alreadyResponded,
      isRejectedByDosen: hasRejection, 
      isReadyToAssign: ready 
    };
  });

  return { userId, proposals: mappedData };
};

export default function AksesProposalKaprodiPage() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading } = useSWR(
    'akses_proposal_kaprodi_list', 
    fetchProposalsData, 
    {
      revalidateOnFocus: true, // Refresh otomatis saat user kembali ke tab browser
      refreshInterval: 60000   // Auto refresh per menit
    }
  );

  const proposals = cache?.proposals || [];

  // State untuk Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBidang, setFilterBidang] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const uniqueBidang = ["Semua", ...Array.from(new Set(proposals.map((p) => p.bidang)))];

  const filteredProposals = proposals.filter((item) => {
    // FILTER LULUS: Sembunyikan proposal yang statusnya sudah Lulus
    const isLulus = item.status_lulus === true || item.status === "Lulus";
    if (isLulus) return false;

    const matchSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.npm?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchBidang = filterBidang === "Semua" || item.bidang === filterBidang;
    
    // FILTER STATUS UPDATED
    const matchStatus =
      filterStatus === "Semua" ||
      (filterStatus === "Diterima" && item.status === "Diterima") ||
      (filterStatus === "Siap Ditetapkan" && item.isReadyToAssign) ||
      (filterStatus === "Ditolak" && (item.status === "Ditolak" || item.status === "Ditolak Dosbing" || item.isRejectedByDosen)) ||
      (filterStatus === "Menunggu" && !item.isReadyToAssign && !item.isRejectedByDosen && !["Diterima", "Ditolak", "Ditolak Dosbing"].includes(item.status));

    return matchSearch && matchBidang && matchStatus;
  });

  const handleReset = () => {
    setSearchQuery("");
    setFilterBidang("Semua");
    setFilterStatus("Semua");
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none ">
                Akses Proposal
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Kelola penugasan pembimbing dan berikan respon jika Anda direkomendasikan.
              </p>
            </div>

            {/* === FILTER SECTION === */}
            <div className="bg-white p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-10 transition-all">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Filter size={18} /></div>
                 <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Filter Pencarian</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">Bidang Kajian</label>
                  <select
                    value={filterBidang}
                    onChange={(e) => setFilterBidang(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-inner"
                  >
                    {uniqueBidang.map((b) => (<option key={b} value={b}>{b}</option>))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">Status Review</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-inner"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Menunggu">Menunggu</option>
                    <option value="Siap Ditetapkan">Siap Ditetapkan</option>
                    <option value="Diterima">Ditetapkan</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">Cari Data</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nama, NPM, atau Judul..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={handleReset}
                    className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                  >
                    <Activity size={14} className="mr-2 inline" /> RESET
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE SECTION */}
            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="py-6 px-8 w-[25%]">Mahasiswa</th>
                      <th className="py-6 px-8 w-[35%] text-center">Usulan Judul</th>
                      <th className="py-6 px-8 text-center w-[15%]">Bidang</th>
                      <th className="py-6 px-8 text-center w-[15%]">Status</th>
                      <th className="py-6 px-8 text-center w-[10%]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading && !cache ? (
                      <>
                        {[1, 2, 3, 4].map((item) => (
                          <tr key={item} className="border-b border-slate-50">
                            <td className="py-8 px-8">
                              <div className="flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                                <div className="flex flex-col gap-2 flex-1">
                                  <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                                  <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="flex flex-col items-center gap-2 animate-pulse">
                                <div className="h-2.5 w-full max-w-[200px] bg-slate-200 rounded-full"></div>
                                <div className="h-2.5 w-3/4 max-w-[150px] bg-slate-200 rounded-full"></div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                               <div className="h-6 w-20 bg-slate-200 rounded-lg mx-auto animate-pulse"></div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-6 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : filteredProposals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <FileText size={48} className="text-slate-100" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Proposal Tidak Ditemukan</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProposals.map((item) => {
                        const isAccepted = item.status === "Diterima";
                        const isRejected = item.status === "Ditolak" || item.status === "Ditolak Dosbing" || item.isRejectedByDosen;
                        const showUrgentAction = item.isRecommendedForMe && !item.hasResponded;
                        const readyToAssign = item.isReadyToAssign;

                        return (
                          <tr 
                            key={item.id} 
                            className={`group transition-all duration-300 ${
                              showUrgentAction ? "bg-blue-50/50 hover:bg-blue-100/50" : "hover:bg-blue-50/30"
                            }`}
                          >
                            <td className="py-8 px-8">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all relative overflow-hidden shrink-0 border border-slate-200 uppercase ${
                                  showUrgentAction 
                                  ? "bg-blue-600 text-white shadow-md animate-pulse border-blue-600" 
                                  : "bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white"
                                }`}>
                                  {item.user?.avatar_url ? (
                                    <Image 
                                      src={item.user.avatar_url} 
                                      alt={item.user?.nama || "User"} 
                                      layout="fill" 
                                      objectFit="cover" 
                                    />
                                  ) : (
                                    item.user?.nama?.charAt(0) || "?"
                                  )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tight">
                                        {item.user?.nama ?? "-"}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black tracking-widest">{item.user?.npm ?? "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 normal-case tracking-tight">"{item.judul}"</p>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <span className="inline-block text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider leading-relaxed">
                                {item.bidang}
                              </span>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                isAccepted 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                  : readyToAssign
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : isRejected
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              }`}>
                                {isAccepted ? "Ditetapkan" : readyToAssign ? "Siap Ditetapkan" : isRejected ? "Ditolak" : "Menunggu"}
                              </span>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <Link href={`/kaprodi/detailproposal?id=${item.id}`}>
                                <button className={`inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group/btn ${
                                  showUrgentAction 
                                  ? "bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-100" 
                                  : readyToAssign
                                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                                  : "bg-slate-900 hover:bg-blue-600 text-white"
                                }`}>
                                  {showUrgentAction ? "RESPON SEKARANG" : readyToAssign ? "SEGERA TETAPKAN" : "DETAIL"}
                                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Terdata: {filteredProposals.length} Proposal Aktif</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}