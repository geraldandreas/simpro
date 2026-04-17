"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { 
  Search, 
  Download,
  ShieldCheck,
  AlertCircle,
  Eye,
  ChevronLeft,
  ArrowRight,
  ChevronRight,
  Scale
} from "lucide-react";
import Link from "next/link";
import NotificationBell from '@/components/notificationBell'; 
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import Image from "next/image";

// --- TYPES ---
interface PengujiStat {
  id: string;
  nama: string;
  nip: string;
  avatar_url: string | null;
  jumlah_menguji: number;
  status_tugas: "Sudah Ditugaskan" | "Belum Ditugaskan";
}

// ================= FETCHER SWR =================
const fetchPengujiData = async () => {
  // 1. Ambil daftar seluruh Dosen & Kaprodi
  const { data: dosens, error: dosenError } = await supabase
    .from("profiles")
    .select("id, nama, nip, avatar_url")
    .in("role", ["dosen", "kaprodi"]);

  if (dosenError) throw dosenError;

  // 2. Ambil data penugasan penguji yang aktif
  const { data: assignments, error: assignError } = await supabase
    .from("examiners")
    .select(`
      dosen_id,
      role,
      seminar_requests!inner(
        proposals!inner(
          status_lulus,
          status
        )
      )
    `);
    
  if (assignError) throw assignError;

  const activeAssignments = (assignments || []).filter((a: any) => {
    const prop = a.seminar_requests?.proposals;
    const isLulus = prop?.status_lulus === true || prop?.status === "Lulus";
    return !isLulus; // Masukkan hitungan HANYA jika mahasiswa belum lulus
  });

  const finalStats: PengujiStat[] = (dosens || []).map((d: any) => {
    // Hitung berapa kali dosen ini muncul di tabel penugasan AKTIF (belum lulus)
    const count = activeAssignments.filter((a: any) => a.dosen_id === d.id).length;
    
    return {
      id: d.id, 
      nama: d.nama, 
      nip: d.nip || "-",
      avatar_url: d.avatar_url || null,
      jumlah_menguji: count,
      status_tugas: count > 0 ? "Sudah Ditugaskan" : "Belum Ditugaskan"
    } as PengujiStat; 
  }).sort((a, b) => b.jumlah_menguji - a.jumlah_menguji); // Urutkan dari yang bebannya paling banyak
  
  return finalStats;
};

export default function MonitoringPengujiSidangPage() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: stats = [], isLoading } = useSWR(
    'monitoring_penguji_list',
    fetchPengujiData,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000
    }
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // STATE UNTUK PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ================= EXPORT EXCEL =================
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      if (stats.length === 0) return alert("Tidak ada data untuk diexport.");

      const excelData: any[][] = [];
      
      // Header Table
      excelData.push(["No", "Nama Dosen Penguji", "NIP", "Total Jadwal Menguji", "Status"]);

      stats.forEach((dosen, index) => {
        excelData.push([
          index + 1, 
          dosen.nama, 
          dosen.nip, 
          dosen.jumlah_menguji, 
          dosen.status_tugas
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Lebar Kolom
      worksheet['!cols'] = [
        { wch: 5 },  // No
        { wch: 40 }, // Nama
        { wch: 20 }, // NIP
        { wch: 25 }, // Total
        { wch: 25 }  // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Beban Penguji`);
      
      XLSX.writeFile(workbook, `Rekap_Beban_Penguji_Sidang_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error("Gagal export excel:", error);
      alert("Terjadi kesalahan saat export file.");
    } finally {
      setIsExporting(false);
    }
  };

  // LOGIKA PEMOTONGAN DATA UNTUK PAGINATION
  const filtered = stats.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTableData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* TITLE & HEADER CONTROLS */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none ">
                 Beban Penguji
                </h1>
                <p className="text-slate-500 font-medium mt-1">
                  Monitoring Distribusi Tugas Menguji Sidang Skripsi Dosen
                </p>
              </div>

              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Cari nama dosen..." 
                    className="pl-11 pr-4 py-3.5 bg-white shadow-lg shadow-slate-200/50 rounded-2xl w-full border-none focus:ring-4 focus:ring-blue-500/20 outline-none font-bold text-xs transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={handleExportExcel}
                  disabled={isExporting || isLoading}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <Download size={16} /> {isExporting ? "Memproses..." : "Rekap Excel"}
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden border border-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="px-10 py-6">Dosen</th>
                      <th className="px-6 py-6 text-center">Beban Menguji</th>
                      <th className="px-6 py-6 text-center">Status Distribusi</th>
                      <th className="px-10 py-6 text-center">Aksi</th>
                    </tr>
                  </thead>
                 <tbody className="divide-y divide-slate-50">
                    {isLoading && stats.length === 0 ? (
                      // 🔥 SKELETON LOADER UNTUK 4 KOLOM 🔥
                      <>
                        {[1, 2, 3, 4, 5].map((item) => (
                          <tr key={item} className="border-b border-slate-50">
                            {/* Kolom Dosen */}
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                                <div className="flex flex-col gap-2">
                                  <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                                  <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                                </div>
                              </div>
                            </td>
                            {/* Kolom Beban Menguji */}
                            <td className="px-6 py-6 text-center">
                              <div className="h-10 w-10 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                            </td>
                            {/* Kolom Status Distribusi */}
                            <td className="px-6 py-6 text-center">
                              <div className="h-8 w-32 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                            </td>
                            {/* Kolom Aksi */}
                            <td className="px-10 py-6 text-center">
                              <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : currentTableData.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Dosen tidak ditemukan</td></tr>
                    ) : (
                      currentTableData.map((dosen) => {
                        const hasTask = dosen.jumlah_menguji > 0;

                        return (
                          <tr key={dosen.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 uppercase overflow-hidden relative shrink-0">
                                  {dosen.avatar_url ? (
                                    <Image src={dosen.avatar_url} alt="Ava" fill className="object-cover" />
                                  ) : (
                                    dosen.nama.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 text-sm tracking-tight">{dosen.nama}</p>
                                  <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">{dosen.nip}</p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-6 text-center">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm ${hasTask ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                {dosen.jumlah_menguji}
                              </span>
                            </td>

                            <td className="px-6 py-6 text-center">
                              <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${hasTask ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {hasTask ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                                {dosen.status_tugas}
                              </div>
                            </td>
                            
                           <td className="px-10 py-6 text-center">
                              <Link 
                                href={`/kaprodi/detailmonitoringpenguji?id=${dosen.id}`} 
                                className={`group/btn inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 outline-none focus:outline-none focus:ring-0 ${hasTask ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                              >
                                DETAIL <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* KOMPONEN PAGINATION AESTHETIC */}
                {!isLoading && totalPages > 1 && (
                  <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                    
                    {/* INFO TEKS DI KIRI */}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Menampilkan {filtered.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} Dosen
                    </p>
  
                    {/* GRUP TOMBOL DI KANAN */}
                    <div className="flex gap-2">
                      
                      {/* Tombol Previous */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={18} strokeWidth={3} />
                      </button>
  
                      {/* Tombol Angka */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm transition-all ${
                            currentPage === page
                              ? "bg-[#3462FA] text-white shadow-[0_8px_20px_-6px_rgba(52,98,250,0.6)]" 
                              : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
  
                      {/* Tombol Next */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={18} strokeWidth={3} />
                      </button>
  
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}