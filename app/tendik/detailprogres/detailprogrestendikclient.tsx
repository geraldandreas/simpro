"use client";

import React, { useEffect, useState } from "react";
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import { 
  Search, Bell, ArrowLeft, FileText, 
  CheckCircle, Eye, Check, X, Download, 
  ShieldCheck, Clock, Layers, LayoutDashboard,
  MoreHorizontal
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SidebarTendik from "@/components/sidebar-tendik"; 

// ================= TYPES =================
interface StudentDetail {
  id: string;
  judul: string;
  status_proposal: string; // Tambahkan ini untuk tracking status utama
  user: {
    nama: string;
    npm: string;
  };
}

interface DocumentData {
  id: string;
  nama_dokumen: string;
  status: string; 
  created_at: string;
  file_url: string;
}

interface GuidanceSession {
  id: string;
  sesi_ke: number;
  tanggal: string;
  dosen_nama: string;
}

const REQUIRED_DOCS = [
  { id: 'berita_acara_bimbingan', label: "Berita Acara Bimbingan" },
  { id: 'transkrip_nilai', label: "Transkrip Nilai" },
  { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi" },
  { id: 'toefl', label: "Sertifikat TOEFL" },
  { id: 'print_jurnal', label: "Print Out Jurnal Skripsi" },
  { id: 'sertifikat_publikasi', label: "Sertifikat Publikasi / Jurnal" },
  { id: 'pengajuan_sidang', label: "Formulir Pengajuan Sidang" },
  { id: 'bukti_bayar', label: "Bukti Pembayaran Registrasi" },
  { id: 'bebas_pus_univ', label: "Bebas Pinjaman Perpustakaan Univ" },
  { id: 'bebas_pus_fak', label: "Bebas Pinjaman Perpustakaan Fak" },
  { id: 'bukti_pengajuan_judul', label: "Bukti pengajuan Topik/Judul" },
  { id: 'skpi', label: "SKPI" },
  { id: 'biodata_sidang', label: "Biodata Sidang" },
  { id: 'foto', label: "Foto Hitam Putih Cerah" },
  { id: 'pengantar_ijazah', label: "Surat Pengantar Ijazah" },
  { id: 'print_skripsi', label: "Print Out Skripsi 3 buah" },
  { id: 'flyer', label: "FLYER Skripsi" },
];

const normalizeStoragePath = (rawPath: string) => {
  if (!rawPath) return "";
  return rawPath.replace(/^docseminar\//gi, "").trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
};

export default function DetailProgresTendikClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [bimbingan, setBimbingan] = useState<GuidanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahap, setTahap] = useState("Memuat...");
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!proposalId) return;
    try {
      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select(`
          id, judul, status,
          profiles!proposals_user_id_fkey (nama, npm), 
          seminar_requests ( tipe, status )
        `)
        .eq("id", proposalId)
        .single();

      if (propError) throw propError;
      
      const profile = Array.isArray(propData.profiles) ? propData.profiles[0] : propData.profiles;
      setStudent({
        id: propData.id,
        judul: propData.judul,
        status_proposal: propData.status,
        user: { nama: profile?.nama || "Tanpa Nama", npm: profile?.npm || "-" }
      });

      // 1. Fetch Berkas
      const { data: docData } = await supabase.from("seminar_documents").select("*").eq("proposal_id", proposalId);
      const currentDocs = docData || [];
      setDocuments(currentDocs);

      // ================= LOGIKA TIMELINE DINAMIS =================
     const hasSeminar =
  propData.seminar_requests?.some((s: any) => s.tipe === "seminar") ?? false;

const ui = mapStatusToUI({
  proposalStatus: propData.status,
  hasSeminar,
});

setTahap(ui.label);

      // 2. Fetch Bimbingan
      const { data: bimData } = await supabase
        .from("guidance_sessions")
        .select(`id, sesi_ke, tanggal, dosen:profiles!guidance_sessions_dosen_id_fkey (nama)`)
        .eq("proposal_id", proposalId)
        .order("tanggal", { ascending: false });

      setBimbingan((bimData || []).map((b: any) => ({
        id: b.id, sesi_ke: b.sesi_ke, tanggal: b.tanggal, dosen_nama: b.dosen?.nama || "-"
      })));

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [proposalId]);

  // Handler lainnya (handleActionFile, handleVerify, dll) tetap sama seperti sebelumnya...
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".dropdown-container")) setActiveDropdownId(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleActionFile = async (rawPath: string, download = false) => {
    if (!rawPath) return;
    try {
      const { data, error } = await supabase.storage.from('docseminar').createSignedUrl(normalizeStoragePath(rawPath), 3600); 
      if (error || !data?.signedUrl) throw new Error();
      if (download) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = rawPath.split("/").pop() || "dokumen.pdf";
        link.click();
      } else {
        window.open(data.signedUrl, '_blank');
      }
    } catch { alert("Gagal memproses berkas."); } finally { setActiveDropdownId(null); }
  };

  const handleVerify = async (docId: string, newStatus: string) => {
    if (!confirm(`Konfirmasi verifikasi dokumen?`)) return;
    setProcessingDoc(docId);
    try {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from('seminar_documents').update({ 
        status: newStatus, verified_at: new Date().toISOString(), verified_by: auth.user?.id 
      }).eq('id', docId);
      await fetchData(); 
    } catch (e) { alert("Gagal update."); } finally { setProcessingDoc(null); setActiveDropdownId(null); }
  };

  const validCount = documents.filter(d => d.status === 'Lengkap').length;
  const progressPercent = Math.round((validCount / REQUIRED_DOCS.length) * 100);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F4F7FE] text-blue-600 font-black animate-pulse uppercase tracking-[0.3em]">Loading System...</div>;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <SidebarTendik />

      <div className="flex-1 ml-64 flex flex-col h-full">
        {/* Header Tetap Sama */}
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                          <div className="flex items-center gap-6">
                            <div className="relative w-72 group">
                            </div>
                          </div>
                
                          <div className="flex items-center gap-6">
                            {/* Minimalist SIMPRO Text */}
                            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                              Simpro
                            </span>
                          </div>
                        </header>

        <main className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          {/* Profile Card Tetap Sama */}
          <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-4">{student?.user.nama}</h1>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-black tracking-widest">{student?.user.npm}</span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600"><Layers size={14}/> Mahasiswa Akhir</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex-1 max-w-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={80}/></div>
              <p className="text-[10px] font-black text-blue-600 mb-2 tracking-[0.2em]">Judul Skripsi Terdaftar</p>
              <h2 className="text-lg font-black text-slate-800 leading-tight italic font-serif normal-case">"{student?.judul}"</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {/* PROGRESS STATS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <ShieldCheck size={32}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Verifikasi</p>
                    <p className="text-xl font-black text-slate-800">{validCount} / {REQUIRED_DOCS.length} Berkas</p>
                  </div>
                </div>
                
                {/* TAHAP SAAT INI - SEKARANG DINAMIS */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <LayoutDashboard size={32}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tahap Saat Ini</p>
                    <p className="text-xl font-black text-emerald-600 uppercase">{tahap}</p>
                  </div>
                </div>
              </div>

              {/* Tabel Dokumen Tetap Sama */}
              <div className="bg-white rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40 overflow-visible">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Manajemen Berkas Seminar</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400">Progres</span>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-xs font-black text-blue-600">{progressPercent}%</span>
                  </div>
                </div>
                
                <div className="divide-y divide-slate-50">
                  {REQUIRED_DOCS.map((doc) => {
                    const data = documents.find(d => d.nama_dokumen === doc.id || d.nama_dokumen === doc.label) || null;
                    const hasFile = !!data?.file_url;
                    
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-blue-50/20 transition-all group relative">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            data?.status === 'Lengkap' ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 
                            data?.status === 'Ditolak' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-300'
                          }`}>
                            {data?.status === 'Lengkap' ? <CheckCircle size={24} /> : <FileText size={24} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{doc.label}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {data ? (
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                  data.status === 'Lengkap' ? 'text-emerald-600 bg-emerald-50' : 
                                  data.status === 'Ditolak' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                                }`}>
                                  {data.status === 'Lengkap' ? 'Verified' : data.status === 'Ditolak' ? 'Rejected' : 'Pending'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Empty</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 dropdown-container">
                          {hasFile ? (
                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdownId(activeDropdownId === data.id ? null : data.id)}
                                className={`p-3 rounded-xl border transition-all ${activeDropdownId === data.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-blue-400 hover:text-blue-600'}`}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {activeDropdownId === data.id && (
                                <div className="absolute right-0 top-12 w-60 bg-white rounded-[1.5rem] shadow-2xl border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                  <div className="p-2 space-y-1">
                                    <button onClick={() => handleActionFile(data.file_url, false)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest">
                                      <Eye size={16} className="text-slate-400" /> Lihat Berkas
                                    </button>
                                    <button onClick={() => handleActionFile(data.file_url, true)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest">
                                      <Download size={16} className="text-slate-400" /> Unduh PDF
                                    </button>
                                    <div className="h-px bg-slate-50 my-1 mx-2" />
                                    <button onClick={() => handleVerify(data.id, 'Lengkap')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition uppercase tracking-widest">
                                      <CheckCircle size={16} /> Verifikasi
                                    </button>
                                    <button onClick={() => handleVerify(data.id, 'Ditolak')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-red-600 hover:bg-red-50 rounded-xl transition uppercase tracking-widest">
                                      <CheckCircle size={16} /> Tolak Berkas
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">No Action</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Riwayat Konsultasi Sidebar Tetap Sama */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl text-white sticky top-28 overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><Clock size={120}/></div>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8 relative z-10">Riwayat Konsultasi</h3>
                <div className="space-y-8 relative z-10">
                  {bimbingan.length === 0 ? (
                    <div className="py-10 text-center opacity-30 italic font-black uppercase tracking-widest text-xs">No guidance record</div>
                  ) : bimbingan.map((sesi, idx) => (
                    <div key={idx} className="relative pl-8 border-l-2 border-white/10 last:border-0 pb-4">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-900" />
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Sesi {sesi.sesi_ke}</p>
                      <p className="text-sm font-black uppercase tracking-tight mb-2">{sesi.dosen_nama.split(',')[0]}</p>
                      <div className="flex items-center gap-2 text-white/40">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold">{new Date(sesi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10 text-center text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
                  System Verified v1.0
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}