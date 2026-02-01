"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, Bell, ArrowLeft, FileText, 
  CheckCircle, Eye, Check, X, Download, 
  ShieldCheck, Clock, Layers, LayoutDashboard
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SidebarTendik from "@/components/sidebar-tendik"; 

// ================= TYPES =================

interface StudentDetail {
  id: string;
  judul: string;
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

export default function DetailProgresTendikPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [bimbingan, setBimbingan] = useState<GuidanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahap, setTahap] = useState("Proses Bimbingan");
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);

  const fetchData = async () => {
    if (!proposalId) return;
    try {
      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select(`
          id, judul,
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
        user: { nama: profile?.nama || "Tanpa Nama", npm: profile?.npm || "-" }
      });

      const seminar = propData.seminar_requests?.find((r: any) => r.tipe === 'seminar');
      if (seminar?.status === 'Lengkap') setTahap("Kesiapan Seminar");
      else if (seminar?.status === 'Menunggu Verifikasi') setTahap("Verifikasi Berkas");
      else setTahap("Proses Bimbingan");

      const { data: docData } = await supabase.from("seminar_documents").select("*").eq("proposal_id", proposalId);
      setDocuments(docData || []);

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

  const handleViewFile = async (rawPath: string) => {
    if (!rawPath) return;
    try {
      const { data, error } = await supabase.storage.from('docseminar').createSignedUrl(normalizeStoragePath(rawPath), 3600); 
      if (error || !data?.signedUrl) throw new Error();
      window.open(data.signedUrl, '_blank');
    } catch { alert("Gagal membuka berkas."); }
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
    } catch (e) { alert("Gagal update."); } finally { setProcessingDoc(null); }
  };

  const validCount = documents.filter(d => d.status === 'Lengkap').length;
  const progressPercent = Math.round((validCount / REQUIRED_DOCS.length) * 100);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F4F7FE] text-blue-600 font-black animate-pulse uppercase tracking-[0.3em]">Loading System...</div>;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden uppercase tracking-tighter">
      <SidebarTendik />

      <div className="flex-1 ml-64 flex flex-col h-full">
        {/* HEADER */}
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                         <div className="flex items-center gap-6">
                           <div className="relative w-72 group">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                             <input 
                               type="text" 
                               placeholder="Cari data..." 
                               className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-xs outline-none transition-all shadow-inner uppercase tracking-widest"
                             />
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
          {/* PROFILE CARD */}
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
            {/* MAIN CONTENT LEFT */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* PROGRESS STATS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <LayoutDashboard size={32}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tahap Saat Ini</p>
                    <p className="text-xl font-black text-emerald-600">{tahap}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
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