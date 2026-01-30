"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Bell, 
  X, 
  Filter, 
  FileText, 
  ChevronRight, 
  Layers, 
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
  user: {
    nama: string | null;
    npm: string | null;
  } | null;
}

export default function AksesProposalPage() {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterBidang, setFilterBidang] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("proposals")
        .select(`id, judul, bidang, status, user:profiles ( nama, npm )`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals((data ?? []) as ProposalItem[]);
    } catch (err) {
      console.error("❌ Gagal mengambil proposal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProposals(); }, []);

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
      (filterStatus === "Menunggu" && item.status !== "Diterima");

    return matchSearch && matchBidang && matchStatus;
  });

  const handleReset = () => {
    setSearchQuery("");
    setFilterBidang("Semua");
    setFilterStatus("Semua");
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F4F7FE] font-sans text-slate-700">
      
      {/* HEADER - Glassmorphism Effect */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Cari proposal..."
            className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-sm outline-none transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 ml-2 uppercase">K</div>
        </div>
      </header>

      <main className="p-10 max-w-[1400px] mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Proposal Mahasiswa
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Review usulan judul dan tentukan dosen pembimbing akademik yang sesuai.
          </p>
        </div>

        {/* === FILTER SECTION - Modernized Card === */}
        <div className="bg-white p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-10 transition-all">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Filter size={18} /></div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Filter Pencarian</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">Bidang Kajian</label>
              <select
                value={filterBidang}
                onChange={(e) => setFilterBidang(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer"
              >
                {uniqueBidang.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">Status Review</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Diterima">Diterima</option>
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleReset}
                className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
              >
                <Activity size={14} /> RESET
              </button>
            </div>
          </div>
        </div>

        {/* TABLE - Padat & Proporsional */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  <th className="py-6 px-8 w-[25%]">Mahasiswa</th>
                  <th className="py-6 px-8 w-[35%]">Usulan Judul</th>
                  <th className="py-6 px-8 text-center w-[15%]">Bidang</th>
                  <th className="py-6 px-8 text-center w-[15%]">Status</th>
                  <th className="py-6 px-8 text-center w-[10%]">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-bold animate-pulse">
                      Menghubungkan ke database...
                    </td>
                  </tr>
                ) : filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText size={48} className="text-slate-100" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Proposal Tidak Ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((item) => {
                    const isAccepted = item.status === "Diterima";

                    return (
                      <tr
                        key={item.id}
                        className="group hover:bg-blue-50/30 transition-all duration-300"
                      >
                        <td className="py-8 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 uppercase">
                              {item.user?.nama?.charAt(0) || "?"}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tight">{item.user?.nama ?? "-"}</p>
                                <p className="text-[10px] text-slate-400 font-black mt-1.5 tracking-tighter">{item.user?.npm ?? "-"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-8 px-8">
                          <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 italic pr-6">
                            "{item.judul}"
                          </p>
                        </td>

                        <td className="py-8 px-8 text-center">
                           <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider">{item.bidang}</span>
                        </td>

                        <td className="py-8 px-8 text-center">
                          <span
                            className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm
                              ${isAccepted ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                          >
                            {isAccepted ? "Ditetapkan" : "Menunggu"}
                          </span>
                        </td>

                        <td className="py-8 px-8 text-center">
                          <Link href={`/kaprodi/dashboardkaprodi/detailproposal?id=${item.id}`}>
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                              DETAIL <ArrowRight size={14} />
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
          
          {/* Bottom Footer Spacing */}
          <div className="p-6 bg-slate-50/30 border-t border-slate-50 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Terdata: {filteredProposals.length} Proposal</p>
          </div>
        </div>
      </main>
    </div>
  );
}