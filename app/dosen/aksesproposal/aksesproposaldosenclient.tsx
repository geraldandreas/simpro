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
  status_lulus: boolean;
  isForMe?: boolean;
  hasResponded?: boolean;
  isReadyToAssign?: boolean;
  isRejectedByDosen?: boolean; 
  user: {
    nama: string | null;
    npm: string | null;
    avatar_url?: string | null;
  };
}

// ================= FETCHER SWR =================
const fetchProposalsDosen = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id || null;
  if (!userId) throw new Error("Not authenticated");

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

  const mappedData = (propData as any[])
    // 🔥 FILTER LULUS: Buang proposal jika status_lulus = true atau status = "Lulus"
    .filter(p => p.status_lulus !== true && p.status !== "Lulus")
    .map(p => {
      const isRecommended = p.proposal_recommendations?.some((r: any) => r.dosen_id === userId);
      const alreadyResponded = p.thesis_supervisors?.some((s: any) => s.dosen_id === userId);
      
      const acceptedCount = p.thesis_supervisors?.filter((s: any) => s.status === 'accepted').length;
      const ready = acceptedCount >= 2 && p.status !== "Diterima";

      const hasRejection = p.thesis_supervisors?.some((s: any) => s.status === 'rejected');
    
    return {
      ...p,
      user: Array.isArray(p.user) ? p.user[0] : p.user, // Pastikan user bukan array
      isForMe: isRecommended,
      hasResponded: alreadyResponded,
      isReadyToAssign: ready,
      isRejectedByDosen: hasRejection
    } as ProposalItem;
  });

  return mappedData;
};

export default function AksesProposalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBidang, setFilterBidang] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: proposals = [], isLoading } = useSWR(
    'akses_proposal_dosen_list',
    fetchProposalsDosen,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  const uniqueBidang = ["Semua", ...Array.from(new Set(proposals.map((p) => p.bidang)))];

  const filteredProposals = proposals.filter((item) => {
    const matchSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.npm?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBidang = filterBidang === "Semua" || item.bidang === filterBidang;
    
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                Proposal Mahasiswa
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Review usulan judul skripsi mahasiswa yang sesuai dengan bidang keahlian Anda.
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
            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="py-6 px-8 w-[25%]">Mahasiswa</th>
                      <th className="py-6 px-8 w-[35%] text-center">Usulan Judul</th>
                      <th className="py-6 px-8 text-center w-[15%]">Bidang</th>
                      <th className="py-6 px-8 text-center w-[15%]">Status</th>
                      <th className="py-6 px-8 text-center w-[10%]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <>
                        {[1, 2, 3, 4, 5].map((item) => (
                          <tr key={item} className="animate-pulse">
                            <td className="py-8 px-8">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>
                                <div className="space-y-3 flex-1">
                                  <div className="h-3 w-32 bg-slate-100 rounded-full"></div>
                                  <div className="h-2 w-20 bg-slate-50 rounded-full"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="flex flex-col items-center gap-2 px-6">
                                <div className="h-2.5 w-full max-w-[280px] bg-slate-100 rounded-full"></div>
                                <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-50 rounded-full"></div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-6 w-20 bg-slate-100 rounded-lg mx-auto"></div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-7 w-28 bg-slate-100 rounded-xl mx-auto"></div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-10 w-28 bg-slate-100 rounded-xl mx-auto"></div>
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
                        const showUrgentAction = item.isForMe && !item.hasResponded;
                        const readyToAssign = item.isReadyToAssign;

                        return (
                          <tr 
                            key={item.id} 
                            className={`group transition-all duration-300 cursor-default ${
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
                               <span className="inline-flex items-center justify-center text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">{item.bidang}</span>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${
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
                              <Link href={`/dosen/detailproposalmahasiswa?id=${item.id}`}>
                                <button className={`inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group/btn whitespace-nowrap ${
                                  showUrgentAction 
                                  ? "bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-100" 
                                  : "bg-slate-900 hover:bg-blue-600 text-white"
                                }`}>
                                  {showUrgentAction ? "RESPON SEKARANG" : "DETAIL"} 
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
              {!isLoading && (
                <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center mt-auto">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Terdata: {filteredProposals.length} Proposal Aktif</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}