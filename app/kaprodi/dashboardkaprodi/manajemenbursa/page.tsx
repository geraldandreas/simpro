"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  TrendingUp, 
  UserCheck,
  Eye,
  Users,
  Download,
  Save,
  History,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  TriangleAlert
} from "lucide-react";
import Link from "next/link";
import NotificationBell from '@/components/notificationBell'; 
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

interface DosenStat {
  id: string;
  nama: string;
  p1_count: number;
  p2_count: number;
  total_peminat: number;
  accepted_count: number; 
  active_students: number; 
}

export default function MonitoringBursaPage() {
  const [stats, setStats] = useState<DosenStat[]>([]);
  const [rawAssignments, setRawAssignments] = useState<any>({}); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State untuk Fitur Arsip
  const [archives, setArchives] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"aktif" | string>("aktif"); 
  const [isProcessing, setIsProcessing] = useState(false);

  // State untuk Modal Arsip & Reset
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [inputTA, setInputTA] = useState("2024/2025");
  const [inputSemester, setInputSemester] = useState("Ganjil");

  // STATE UNTUK PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetchArchivesList();
    fetchActiveData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  const fetchArchivesList = async () => {
    const { data } = await supabase
      .from("bimbingan_archives")
      .select("id, tahun_ajaran, semester")
      .order("created_at", { ascending: false });
    if (data) setArchives(data);
  };

  const fetchActiveData = async () => {
    setLoading(true);
    try {
      const { data: dosens } = await supabase.from("profiles").select("id, nama, nip").in("role", ["dosen", "kaprodi"]);
      const { data: recs } = await supabase.from("proposal_recommendations").select("dosen_id, tipe");
      const { data: sups } = await supabase.from("thesis_supervisors").select(`
          dosen_id, role, status, proposal_id,
          proposal:proposals ( status, judul, user:profiles ( nama, npm ) )
      `);

      if (sups && dosens) setRawAssignments({ sups, dosens });

      const finalStats = (dosens || []).map(d => {
        const p1 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing1").length || 0;
        const p2 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing2").length || 0;
        const acc = sups?.filter(s => s.dosen_id === d.id && s.status === "accepted").length || 0;
        const mahasiswaAktif = sups?.filter((s: any) => s.dosen_id === d.id && s.proposal?.status === "Diterima") || [];
        const uniqueCount = new Set(mahasiswaAktif.map((s: any) => s.proposal_id)).size;

        return {
          id: d.id, nama: d.nama, p1_count: p1, p2_count: p2, total_peminat: p1 + p2,
          accepted_count: acc, active_students: uniqueCount
        };
      }).sort((a, b) => b.total_peminat - a.total_peminat);

      setStats(finalStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = async (mode: string) => {
    setViewMode(mode);
    if (mode === "aktif") {
      fetchActiveData();
    } else {
      setLoading(true);
      const { data } = await supabase.from("bimbingan_archives").select("data_json").eq("id", mode).single();
      if (data) {
        setStats(data.data_json.stats);
        setRawAssignments(data.data_json.rawAssignments);
      }
      setLoading(false);
    }
  };

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
      fetchArchivesList(); 
    } catch (error: any) {
      alert("❌ Gagal menyimpan arsip: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔥 FUNGSI RESET DATA SEMESTER 🔥
  const handleResetData = async () => {
    // Pengamanan double check agar Kaprodi tidak salah klik
    const confirm1 = window.confirm("PERINGATAN: Anda akan menghapus SELURUH data penugasan pembimbing dan peminat dosen saat ini. Apakah Anda yakin?");
    if (!confirm1) return;
    
    const confirm2 = window.prompt("Ketik 'RESET' untuk mengonfirmasi penghapusan data secara permanen:");
    if (confirm2 !== "RESET") {
      alert("Penghapusan data dibatalkan.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Hapus semua data dari thesis_supervisors
      const { error: err1 } = await supabase.from('thesis_supervisors').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to match all rows
      if (err1) throw err1;

      // 2. Hapus semua data dari proposal_recommendations
      const { error: err2 } = await supabase.from('proposal_recommendations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err2) throw err2;

      alert("✅ Data berhasil di-reset! Sistem siap untuk pendaftaran mahasiswa di semester baru.");
      setShowResetModal(false);
      fetchActiveData(); // Refresh UI
    } catch (err: any) {
      alert("Terjadi kesalahan saat menghapus data: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ================= EXPORT EXCEL =================
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

  const [isExporting, setIsExporting] = useState(false);
  
  const filtered = stats.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTableData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6"></div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">Simpro</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* JUDUL */}
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Bursa Dosbing</h1>
              <p className="text-slate-500 font-bold mt-3 uppercase tracking-widest text-[10px]">Monitoring Beban Kerja & Usulan Mahasiswa</p>
            </div>

            {/* PANEL KONTROL: ARSIP & EXCEL */}
            <div className={`p-6 rounded-[2rem] border shadow-lg mb-10 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all ${viewMode === "aktif" ? "bg-white border-white shadow-slate-200/50" : "bg-amber-50 border-amber-200 shadow-amber-100"}`}>
              
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className={`p-3 rounded-xl ${viewMode === "aktif" ? "bg-blue-50 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                  {viewMode === "aktif" ? <TrendingUp size={20} /> : <History size={20} />}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tampilkan Data</label>
                  <select 
                    value={viewMode}
                    onChange={(e) => handleViewChange(e.target.value)}
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

            {/* TABLE */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosen Pengajar</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Peminat (P1/P2)</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Disetujui</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mhs Bimbingan</th>
                    {viewMode === "aktif" && <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em]">Memuat Data...</td></tr>
                  ) : currentTableData.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm italic">Data dosen tidak ditemukan</td></tr>
                  ) : (
                    currentTableData.map((dosen) => (
                      <tr key={dosen.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-7">
                          <p className="font-black text-slate-800 text-sm uppercase leading-tight">{dosen.nama}</p>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-black text-[11px]">P1: {dosen.p1_count}</span>
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black text-[11px]">P2: {dosen.p2_count}</span>
                          </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
                            <UserCheck size={16} />
                            {dosen.accepted_count}
                          </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-700 font-black text-sm">
                            <Users size={16} className="text-slate-400" />
                            {dosen.active_students}
                          </div>
                        </td>
                        {viewMode === "aktif" && (
                          <td className="px-10 py-7 text-right">
                            <Link 
                              href={`/kaprodi/dashboardkaprodi/detailmanajemenbursa?id=${dosen.id}&nama=${encodeURIComponent(dosen.nama)}`}
                              className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 shadow-slate-200"
                            >
                              <Eye size={14} /> Lihat Detail
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* KOMPONEN PAGINATION AESTHETIC (Sesuai Gambar) */}
              {!loading && totalPages > 1 && (
                <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-14 h-14 bg-white border border-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} strokeWidth={3} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] font-black text-lg transition-all ${
                        currentPage === page
                          ? "bg-[#3462FA] text-white shadow-[0_8px_20px_-6px_rgba(52,98,250,0.6)]" 
                          : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-14 h-14 bg-white border border-slate-200 rounded-[1.25rem] flex items-center justify-center text-slate-400 hover:text-[#3462FA] hover:border-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* ================= MODAL SIMPAN ARSIP MANUAL ================= */}
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
                <button 
                  type="button" 
                  onClick={() => setShowArchiveModal(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-blue-600 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? "Menyimpan..." : "Konfirmasi Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI RESET DATA ================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-2 border-red-500">
            <div className="px-8 py-8 flex flex-col items-center text-center bg-red-50">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <TriangleAlert size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter mb-2">
                Peringatan Bahaya
              </h3>
              <p className="text-sm font-bold text-red-900/70 leading-relaxed">
                Tindakan ini akan menghapus permanen <b>seluruh data dosen pembimbing dan antrean bursa mahasiswa</b> saat ini. Pastikan Anda telah menekan tombol "Simpan Arsip" sebelum melanjutkan.
              </p>
            </div>

            <div className="p-8 bg-white">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResetData}
                  disabled={isProcessing}
                  className="w-full px-6 py-4 text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? "MEMPROSES PENGHAPUSAN..." : "Ya, Saya Paham & Reset Data"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowResetModal(false)}
                  disabled={isProcessing}
                  className="w-full px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}