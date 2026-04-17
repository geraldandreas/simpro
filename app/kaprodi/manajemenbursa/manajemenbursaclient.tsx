"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { 
  Search, 
  TrendingUp, 
  UserCheck,
  Users,
  Download,
  Save,
  History,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ArrowRight,
  TriangleAlert
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

// --- TYPES ---
interface DosenStat {
  id: string;
  nama: string;
  p1_count: number;
  p2_count: number;
  total_peminat: number;
  accepted_count: number; 
  active_students: number; 
}

// ================= FETCHER SWR =================
const fetchArchivesList = async () => {
  const { data, error } = await supabase
    .from("bimbingan_archives")
    .select("id, tahun_ajaran, semester")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

const fetchBursaData = async (mode: string) => {
  if (mode === "aktif") {
    const { data: dosens } = await supabase.from("profiles").select("id, nama, nip").in("role", ["dosen", "kaprodi"]);
    const { data: recs } = await supabase.from("proposal_recommendations").select("dosen_id, tipe");
    const { data: sups } = await supabase.from("thesis_supervisors").select(`
        dosen_id, role, status, proposal_id,
        proposal:proposals ( status, status_lulus, judul, user:profiles ( nama, npm ) )
    `);

    const rawAssignments = { sups, dosens };

    const finalStats = (dosens || []).map(d => {
      const p1 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing1").length || 0;
      const p2 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing2").length || 0;
      
      const bimbinganDosen = sups?.filter((s: any) => {
         const isMilikDosen = s.dosen_id === d.id;
         const isAccDosen = s.status === "accepted";
         const isNotLulus = s.proposal?.status_lulus !== true && s.proposal?.status !== "Lulus";
         return isMilikDosen && isAccDosen && isNotLulus;
      }) || [];

      const acc = bimbinganDosen.length;
      const mahasiswaAktif = bimbinganDosen.filter((s: any) => s.proposal?.status === "Diterima");
      const uniqueCount = new Set(mahasiswaAktif.map((s: any) => s.proposal_id)).size;

      return {
        id: d.id, nama: d.nama, p1_count: p1, p2_count: p2, total_peminat: p1 + p2,
        accepted_count: acc, active_students: uniqueCount
      };
    }).sort((a, b) => b.total_peminat - a.total_peminat);

    return { stats: finalStats, rawAssignments };
  } else {
    const { data, error } = await supabase.from("bimbingan_archives").select("data_json").eq("id", mode).single();
    if (error) throw error;
    
    if (data) {
      return {
        stats: data.data_json.stats,
        rawAssignments: data.data_json.rawAssignments
      };
    }
    return { stats: [], rawAssignments: {} };
  }
};

export default function MonitoringBursaPage() {
  const [viewMode, setViewMode] = useState<"aktif" | string>("aktif"); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🔥 IMPLEMENTASI SWR 🔥
  // 1. Fetcher Arsip List
  const { data: archives = [], mutate: mutateArchives } = useSWR(
    'archives_list', 
    fetchArchivesList, 
    { revalidateOnFocus: true }
  );

  // 2. Fetcher Data Bursa (Bergantung pada viewMode)
  const { data: bursaData, isLoading, mutate: mutateBursa } = useSWR(
    ['bursa_data', viewMode], 
    ([_, mode]) => fetchBursaData(mode), 
    { revalidateOnFocus: true, refreshInterval: 60000 }
  );

  // Extract cache
  const stats: DosenStat[] = bursaData?.stats || [];
  const rawAssignments = bursaData?.rawAssignments || {};
  const isDataLoading = isLoading && !bursaData;

  // State Murni Komponen
  const [isProcessing, setIsProcessing] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [inputTA, setInputTA] = useState("2024/2025");
  const [inputSemester, setInputSemester] = useState("Ganjil");
  const [isExporting, setIsExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  // ================= ACTIONS =================
  const confirmSaveArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTA || !inputSemester) return alert("Harap isi Tahun Ajaran dan Semester!");

    setIsProcessing(true);
    try {
      const payload = {
        tahun_ajaran: inputTA,
        semester: inputSemester,
        data_json: { stats, rawAssignments } 
      };

      const { error } = await supabase.from("bimbingan_archives").upsert(payload, { onConflict: 'tahun_ajaran,semester' });
      
      if (error) throw error;
      alert(`✅ Arsip untuk TA ${inputTA} Semester ${inputSemester} berhasil disimpan!`);
      
      setShowArchiveModal(false); 
      mutateArchives(); // 🔥 Refresh data list arsip
    } catch (error: any) {
      alert("❌ Gagal menyimpan arsip: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetData = async () => {
    const confirm1 = window.confirm("PERINGATAN: Anda akan menghapus SELURUH data penugasan pembimbing dan peminat dosen saat ini. Apakah Anda yakin?");
    if (!confirm1) return;
    
    const confirm2 = window.prompt("Ketik 'RESET' untuk mengonfirmasi penghapusan data secara permanen:");
    if (confirm2 !== "RESET") {
      alert("Penghapusan data dibatalkan.");
      return;
    }

    setIsProcessing(true);
    try {
      const { error: err1 } = await supabase.from('thesis_supervisors').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      if (err1) throw err1;

      const { error: err2 } = await supabase.from('proposal_recommendations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err2) throw err2;

      alert("✅ Data berhasil di-reset! Sistem siap untuk pendaftaran mahasiswa di semester baru.");
      setShowResetModal(false);
      mutateBursa(); // 🔥 Refresh data Bursa yang aktif
    } catch (err: any) {
      alert("Terjadi kesalahan saat menghapus data: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const { sups, dosens } = rawAssignments as any;
      if (!sups || !dosens) return alert("Data belum siap untuk diexport");

      const excelData: any[][] = [];
      const merges: any[] = [];
      let currentRowIndex = 0;

      const buildSection = (roleTarget: string, sectionTitle: string) => {
        excelData.push(["No", sectionTitle, "NIP", "No", "Nama Mahasiswa", "NPM"]);
        currentRowIndex++;

        let dosenNo = 1;

        dosens.forEach((dosen: any) => {
          const bimbingan = sups.filter((s: any) => 
            s.dosen_id === dosen.id && 
            s.role === roleTarget &&
            s.status === "accepted" && 
            s.proposal?.status === "Diterima"
          );

          if (bimbingan.length > 0) {
            const startRow = currentRowIndex;

            bimbingan.forEach((b: any, index: number) => {
              const nip = dosen.nip || "-";
              const mhsNama = b.proposal?.user?.nama || "Unknown";
              const mhsNpm = b.proposal?.user?.npm || "-";

              if (index === 0) {
                excelData.push([dosenNo, dosen.nama, nip, index + 1, mhsNama, mhsNpm]);
              } else {
                excelData.push(["", "", "", index + 1, mhsNama, mhsNpm]);
              }
              currentRowIndex++;
            });

            if (bimbingan.length > 1) {
              const endRow = currentRowIndex - 1;
              merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } }); 
              merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } }); 
              merges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } }); 
            }
            dosenNo++;
          }
        });

        excelData.push([]); 
        currentRowIndex++;
      };

      buildSection("utama", "Pembimbing Utama");
      buildSection("pendamping", "Co. Pembimbing");

      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      worksheet['!merges'] = merges;

      worksheet['!cols'] = [
        { wch: 5 },  
        { wch: 35 }, 
        { wch: 20 }, 
        { wch: 5 },  
        { wch: 35 }, 
        { wch: 15 }  
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Lampiran Surat Tugas`);
      
      let fileName = "Lampiran_Surat_Tugas_Bimbingan_Aktif.xlsx";
      if (viewMode !== "aktif") {
        const selectedArchive = archives.find(a => a.id === viewMode);
        if (selectedArchive) {
          fileName = `Lampiran_Surat_Tugas_TA_${selectedArchive.tahun_ajaran.replace("/", "-")}_${selectedArchive.semester}.xlsx`;
        }
      }

      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error("Gagal export excel:", error);
      alert("Terjadi kesalahan saat export file.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // ================= UI RENDER DATA =================
  const filtered = stats.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTableData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none ">Bursa Dosbing</h1>
              <p className="text-slate-500 font-medium mt-1">Monitoring Beban Kerja & Usulan Mahasiswa</p>
            </div>

            <div className={`p-6 rounded-[2rem] border shadow-lg mb-10 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all ${viewMode === "aktif" ? "bg-white border-white shadow-slate-200/50" : "bg-amber-50 border-amber-200 shadow-amber-100"}`}>
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className={`p-3 rounded-xl ${viewMode === "aktif" ? "bg-blue-50 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                  {viewMode === "aktif" ? <TrendingUp size={20} /> : <History size={20} />}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tampilkan Data</label>
                  <select 
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)} // Cukup set state saja
                    className="bg-transparent text-sm font-black text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="aktif">Data Saat Ini (Live)</option>
                    {archives.map(a => (
                      <option key={a.id} value={a.id}>Arsip: TA {a.tahun_ajaran} ({a.semester})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                {viewMode === "aktif" && (
                  <>
                    <button 
                      onClick={() => setShowArchiveModal(true)} 
                      disabled={isProcessing}
                      className="flex-1 lg:flex-none items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 inline-flex"
                    >
                      <Save size={16} /> {isProcessing ? "Menyimpan..." : "Simpan Arsip"}
                    </button>
                    <button 
                      onClick={() => setShowResetModal(true)} 
                      disabled={isProcessing}
                      className="flex-1 lg:flex-none items-center justify-center gap-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-200 hover:border-red-600 active:scale-95 disabled:opacity-50 inline-flex"
                    >
                      <RefreshCcw size={16} /> Reset Semester
                    </button>
                  </>
                )}
                <button 
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="flex-1 lg:flex-none items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 inline-flex"
                >
                  <Download size={16} /> {isExporting ? "Memproses..." : "Download Rekap"}
                </button>
              </div>
            </div>

            {viewMode !== "aktif" && (
              <div className="mb-8 p-4 bg-amber-100 border border-amber-200 text-amber-700 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
                <AlertCircle size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Anda sedang melihat data masa lalu. Data pada tabel di bawah ini bersifat Read-Only (Tidak bisa diubah).</span>
              </div>
            )}

            <div className="flex justify-end mb-6">
               <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari nama dosen..." 
                    className="pl-12 pr-6 py-4 bg-white shadow-xl shadow-slate-200/50 rounded-2xl w-full border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-10 py-8">Dosen Pengajar</th>
                    <th className="px-6 py-8 text-center">Peminat (P1/P2)</th>
                    <th className="px-6 py-8 text-center">Disetujui</th>
                    <th className="px-6 py-8 text-center">Mahasiswa Bimbingan</th>
                    {viewMode === "aktif" && <th className="px-10 py-8 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isDataLoading ? (
                    <>
                      {[1, 2, 3, 4, 5].map((item) => (
                        <tr key={item} className="border-b border-slate-50">
                          <td className="px-10 py-7"><div className="h-4 w-48 bg-slate-200 rounded-full animate-pulse"></div></td>
                          <td className="px-6 py-7 text-center">
                            <div className="flex items-center justify-center gap-2 animate-pulse">
                              <div className="h-6 w-14 bg-slate-200 rounded-lg"></div>
                              <div className="h-6 w-14 bg-slate-100 rounded-lg"></div>
                            </div>
                          </td>
                          <td className="px-6 py-7 text-center"><div className="h-5 w-12 bg-slate-200 rounded-md mx-auto animate-pulse"></div></td>
                          <td className="px-6 py-7 text-center"><div className="h-5 w-12 bg-slate-200 rounded-md mx-auto animate-pulse"></div></td>
                          {viewMode === "aktif" && (
                            <td className="px-10 py-7 text-center"><div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div></td>
                          )}
                        </tr>
                      ))}
                    </>
                  ) : currentTableData.length === 0 ? (
                    <tr><td colSpan={viewMode === "aktif" ? 5 : 4} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm italic">Data dosen tidak ditemukan</td></tr>
                  ) : (
                    currentTableData.map((dosen) => (
                      <tr key={dosen.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-7">
                          <p className="font-black text-slate-800 text-sm leading-tight">{dosen.nama}</p>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-black text-[11px]">P1: {dosen.p1_count}</span>
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black text-[11px]">P2: {dosen.p2_count}</span>
                          </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
                            <UserCheck size={16} /> {dosen.accepted_count}
                          </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-700 font-black text-sm">
                            <Users size={16} className="text-slate-400" /> {dosen.active_students}
                          </div>
                        </td>
                        {viewMode === "aktif" && (
                        <td className="px-10 py-7 text-center">
                          <Link 
                              href={`/kaprodi/detailmanajemenbursa?id=${dosen.id}&nama=${encodeURIComponent(dosen.nama)}`}
                              className="group/btn inline-flex justify-center items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 shadow-slate-200 outline-none focus:outline-none focus:ring-0"
                          >
                              DETAIL <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {!isDataLoading && totalPages > 1 && (
                <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Menampilkan {filtered.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} Dosen
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} strokeWidth={3} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm transition-all ${
                          currentPage === page ? "bg-[#3462FA] text-white shadow-[0_8px_20px_-6px_rgba(52,98,250,0.6)]" : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}
              </div>
          </div>
        </main>
      </div>

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <Save size={20} className="text-blue-600" /> Simpan Arsip
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <form onSubmit={confirmSaveArchive} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tahun Ajaran</label>
                <input 
                  type="text" 
                  value={inputTA}
                  onChange={(e) => setInputTA(e.target.value)}
                  placeholder="Cth: 2025/2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Semester</label>
                <select 
                  value={inputSemester}
                  onChange={(e) => setInputSemester(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all cursor-pointer"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed">
                Menyimpan arsip pada TA/Semester yang sama akan menimpa (update) data sebelumnya.
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowArchiveModal(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-blue-600 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {isProcessing ? "Menyimpan..." : "Konfirmasi Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-2 border-red-500">
            <div className="px-8 py-8 flex flex-col items-center text-center bg-red-50">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <TriangleAlert size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter mb-2">Peringatan Bahaya</h3>
              <p className="text-sm font-bold text-red-900/70 leading-relaxed">Tindakan ini akan menghapus permanen <b>seluruh data dosen pembimbing dan antrean bursa mahasiswa</b> saat ini. Pastikan Anda telah menekan tombol "Simpan Arsip" sebelum melanjutkan.</p>
            </div>
            <div className="p-8 bg-white">
              <div className="flex flex-col gap-3">
                <button onClick={handleResetData} disabled={isProcessing} className="w-full px-6 py-4 text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50">
                  {isProcessing ? "MEMPROSES PENGHAPUSAN..." : "Ya, Saya Paham & Reset Data"}
                </button>
                <button type="button" onClick={() => setShowResetModal(false)} disabled={isProcessing} className="w-full px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}