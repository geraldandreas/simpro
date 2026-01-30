"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, X } from "lucide-react"; // Import X untuk tombol reset
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/sidebar-dosen";

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

// ================= PAGE =================

export default function AksesProposalPage() {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBidang, setFilterBidang] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  // ================= FETCH PROPOSALS =================

  const fetchProposals = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("proposals")
        .select(
          `
          id,
          judul,
          bidang,
          status,
          user:profiles (
            nama,
            npm
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProposals((data ?? []) as ProposalItem[]);
    } catch (err) {
      console.error("❌ Gagal mengambil proposal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // ================= FILTER LOGIC =================

  // Ambil list unik bidang dari data untuk dropdown
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
      (filterStatus === "Menunggu" && item.status !== "Diterima"); // Asumsi selain Diterima adalah Menunggu

    return matchSearch && matchBidang && matchStatus;
  });

  const handleReset = () => {
    setSearchQuery("");
    setFilterBidang("Semua");
    setFilterStatus("Semua");
  };

  // ================= RENDER =================

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
              size={18}
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
            <Bell size={20} className="text-gray-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        <main className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Proposal Mahasiswa
            </h1>
            <p className="text-gray-600">
              Tinjau dan pilih topik yang sesuai dengan bidang keahlian Anda
            </p>
          </div>

          {/* === FILTER SECTION === */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              
              {/* Filter Bidang */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Bidang</label>
                <select
                  value={filterBidang}
                  onChange={(e) => setFilterBidang(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                >
                  {uniqueBidang.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Diterima">Diterima</option>
                </select>
              </div>

              {/* Search */}
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Cari Proposal</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama, NPM, atau Judul..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div className="md:col-span-2">
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <X size={14} /> RESET
                </button>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-gray-200">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase w-[20%]">
                      Nama Mahasiswa
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase w-[15%]">
                      NPM
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase w-[30%]">
                      Judul
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-center w-[10%]">
                      Bidang
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-center w-[15%]">
                      Status
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-center w-[10%]">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">
                        Memuat data proposal...
                      </td>
                    </tr>
                  ) : filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <Search size={32} className="opacity-20" />
                          <p>Data tidak ditemukan.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((item) => {
                      const isAccepted = item.status === "Diterima";

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-5 px-6 text-sm font-bold text-gray-900 truncate">
                            {item.user?.nama ?? "-"}
                          </td>

                          <td className="py-5 px-6 text-sm font-medium text-gray-500">
                            {item.user?.npm ?? "-"}
                          </td>

                          <td className="py-5 px-6 text-sm font-medium text-gray-800 line-clamp-2">
                            {item.judul}
                          </td>

                          <td className="py-5 px-6 text-sm text-center text-gray-600">
                            {item.bidang}
                          </td>

                          <td className="py-5 px-6">
                            <div
                              className={`flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-bold w-fit mx-auto shadow-sm
                                ${
                                  isAccepted
                                    ? "bg-[#DCFCE7] text-[#166534]"
                                    : "bg-[#FDE68A] text-[#92400E]"
                                }`}
                            >
                              {/* Icon Hourglass dihapus */}
                              <span>{isAccepted ? "Diterima" : "Menunggu Verifikasi"}</span>
                            </div>
                          </td>

                          <td className="py-5 px-6 text-center">
                            <Link href={`detailproposalmahasiswa?id=${item.id}`}>
                              <button className="px-4 py-2 bg-[#8C8C8C] text-white text-xs font-bold rounded-lg hover:bg-gray-600 transition-colors shadow-sm whitespace-nowrap">
                                Lihat Detail
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
          </div>
        </main>
      </div>
    </div>
  );
}