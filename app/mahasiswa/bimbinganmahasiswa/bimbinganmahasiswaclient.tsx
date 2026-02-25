"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notificationBell";
import Link from "next/link";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface BimbinganRow {
  id: string;
  sesi: string;
  hariTanggal: string;
  waktu: string;
  metodeOrStatus: string;
  keterangan: string;
  pembimbing: string;
  status: string;
  kehadiran: string;
  feedback?: string;
}

export default function BimbinganMahasiswaClient() {
  const [activeTab, setActiveTab] = useState<"jadwal" | "riwayat">("jadwal");
  const [rows, setRows] = useState<BimbinganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ================= FETCH DATA (Backend Logic Tetap) =================
  const fetchBimbingan = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;

      const { data: proposalData, error: proposalError } = await supabase
        .from("proposals")
        .select("id, status")
        .eq("user_id", userId)
        .single();

      if (proposalError) throw proposalError;

      if (proposalData?.status !== "Diterima") {
        setRows([]);
        setLoading(false);
        return;
      }

      // Query mengambil data termasuk 'keterangan' dari tabel guidance_sessions
      const { data, error } = await supabase
        .from("guidance_sessions")
        .select(`
          id, sesi_ke, tanggal, jam, metode, keterangan, status, kehadiran_mahasiswa,
          dosen:profiles ( nama ),
          proposal:proposals ( user_id ),
          feedbacks:session_feedbacks ( status_revisi, created_at )
        `)
        .eq("proposal.user_id", userId)
        .order("tanggal", { ascending: true });

      if (error) throw error;

      const mapped: BimbinganRow[] = (data || []).map((row: any) => {
        const tanggal = new Date(row.tanggal);
        return {
          id: row.id,
          sesi: ` ${row.sesi_ke}`,
          hariTanggal: tanggal.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
          waktu: row.jam?.slice(0, 5) ?? "-",
          metodeOrStatus: activeTab === "jadwal" ? row.metode || "-" : row.status || "-",
          keterangan: row.keterangan || "-", // Map keterangan manual dosen
          pembimbing: row.dosen?.nama ?? "-",
          status: row.status,
          kehadiran: row.kehadiran_mahasiswa,
          feedback: row.feedbacks[0]?.status_revisi,
        };
      });
      setRows(mapped);
    } catch (err) {
      console.error("❌ Gagal load bimbingan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBimbingan(); }, [activeTab]);

// 🔥 1. FILTER DATA TERLEBIH DAHULU (Menghilangkan error variabel tidak ditemukan)
  const filteredRows = activeTab === "jadwal"
    ? rows.filter(r => r.status !== "selesai" && r.status !== "revisi" && r.status !== "dibatalkan")
    : rows.filter(r => (r.feedback === "disetujui" || r.feedback === "revisi") && r.kehadiran === "hadir");

  // 🔥 2. LOGIKA SLICING (Menghitung data yang tampil di halaman aktif)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredRows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col h-screen overflow-hidden">
        {/* HEADER - Glassmorphism Simplified */}
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

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            <header className="mb-10 flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Manajemen Bimbingan</h1>
                <p className="text-slate-500 font-medium mt-1">Pantau jadwal dan ringkasan riwayat konsultasi akademik Anda secara real-time.</p>
            </header>

            {/* TABS */}
            <div className="flex bg-slate-200/50 w-fit p-1.5 rounded-2xl mb-10 shadow-inner">
              <button
                onClick={() => setActiveTab("jadwal")}
                className={`px-8 py-2.5 text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-widest ${
                  activeTab === "jadwal" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Jadwal Mendatang
              </button>
              <button
                onClick={() => setActiveTab("riwayat")}
                className={`px-8 py-2.5 text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-widest ${
                  activeTab === "riwayat" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Riwayat Selesai
              </button>
            </div>

            {/* TABLE CONTAINER - Proportional Column Widths */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <LayoutDashboard size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                  Log Konsultasi Mahasiswa
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="px-8 py-6 w-[12%]">Sesi</th>
                      <th className="px-8 py-6 w-[28%]">Waktu & Keterangan</th>
                      {activeTab === "jadwal" ? (
                        <>
                          <th className="px-8 py-6 w-[15%]">Metode</th>
                          <th className="px-8 py-6 w-[30%]">Pembimbing</th>
                        </>
                      ) : (
                        <>
                          <th className="px-8 py-6 w-[20%] text-center">Pembimbing</th>
                          <th className="px-8 py-6 text-center w-[15%]">Hasil Review</th>
                          <th className="px-8 py-6 text-center w-[10%]">Presensi</th>
                        </>
                      )}
                      <th className="px-8 py-6 text-center w-[15%]">Tindakan</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Sinkronisasi Data...</td>
                      </tr>
                    ) : currentData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Calendar className="text-slate-100" size={80} />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Tidak ada sesi ditemukan</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentData.map((item) => (
                        <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                          <td className="px-8 py-8">
                            <span className="text-sm font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm uppercase">
                              {item.sesi}
                            </span>
                          </td>

                          <td className="px-8 py-8">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-tighter">
                                <Calendar size={14} className="text-blue-500" /> {item.hariTanggal}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 tracking-widest uppercase">
                                <Clock size={14} className="text-slate-300" /> {item.waktu} WIB
                              </div>
                              
                              {/* RENDER KETERANGAN MANUAL DOSEN */}
                              {item.keterangan && item.keterangan !== "-" && (
                                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-2xl max-w-[280px] shadow-sm animate-in fade-in zoom-in-95 duration-500">
                                  <div className="mt-0.5 text-amber-500 shrink-0">
                                    <Info size={14} strokeWidth={3} />
                                  </div>
                                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
                                    "{item.keterangan}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>

                          {activeTab === "jadwal" ? (
                            <>
                              <td className="px-8 py-8">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                  {item.metodeOrStatus === "Daring" ? <Video size={16} className="text-indigo-500" /> : <MapPin size={16} className="text-orange-500" />}
                                  {item.metodeOrStatus}
                                </div>
                              </td>
                              <td className="px-8 py-8">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner uppercase shrink-0">
                                    {item.pembimbing.charAt(0)}
                                  </div>
                                  <p className="text-sm font-black text-slate-700 tracking-tight uppercase truncate">{item.pembimbing}</p>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-8 py-8 text-sm font-black text-slate-700 uppercase tracking-tight text-center">{item.pembimbing}</td>
                              <td className="px-8 py-8 text-center">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                  item.feedback === "disetujui" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
                                }`}>
                                  {item.feedback || "Reviewing"}
                                </span>
                              </td>
                              <td className="px-8 py-8 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">
                                  <CheckCircle2 size={16} /> Hadir
                                </div>
                              </td>
                            </>
                          )}

                          <td className="px-8 py-8 text-center">
                            <Link href={`/mahasiswa/bimbinganmahasiswa/detailbimbingan?id=${item.id}`}>
                              <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg active:scale-95 group/btn">
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

              {/* PAGINATION */}
              <div className="p-10 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredRows.length)} dari {filteredRows.length} Sesi
                </p>
                
                <div className="flex gap-2">
                  <PaginationButton 
                    icon={<ChevronLeft size={18} />} 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationButton 
                      key={i} 
                      label={(i + 1).toString()} 
                      active={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                    />
                  ))}

                  <PaginationButton 
                    icon={<ChevronRight size={18} />} 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// 🔥 UPDATE HELPER PAGINATION BUTTON AGAR BISA KLIK
function PaginationButton({ 
  label, 
  icon, 
  active = false, 
  onClick, 
  disabled = false 
}: { 
  label?: string; 
  icon?: React.ReactNode; 
  active?: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-12 h-12 flex items-center justify-center rounded-[1.25rem] text-[10px] font-black transition-all shadow-md active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
        active 
          ? "bg-blue-600 text-white shadow-blue-100 shadow-xl" 
          : "bg-white text-slate-400 border border-slate-100 hover:border-blue-400 hover:text-blue-600"
      }`}
    >
      {label || icon}
    </button>
  );
}