"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { sendNotification } from "@/lib/notificationUtils";
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import { 
  ArrowLeft, FileText, 
  CheckCircle, Eye, Download, 
  ShieldCheck, Clock, LayoutDashboard,
  MoreHorizontal,
  XCircle
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface StudentDetail {
  id: string;
  judul: string;
  status_proposal: string; 
  user: {
    nama: string;
    npm: string;
    id: string; 
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

// ================= CONSTANTS =================
const REQUIRED_DOCS = [
  { id: 'form_layak_dan_jadwal', label: "Form Layak Seminar & Pengajuan Jadwal", type: 'online' },
  { id: 'nilai_magang_gabungan', label: "Form Nilai Magang (Dosen Wali & Lapangan)", type: 'online' },
  { id: 'bukti_serah_magang', label: "Bukti Penyerahan Laporan Magang", type: 'online' },
  { id: 'draft_skripsi', label: "Draft Skripsi (Untuk Dosen Penguji)", type: 'online' }, 
];

const SIDANG_DOCS = [
  { id: 'form_pengajuan_sidang', label: "Formulir Pengajuan Sidang Tugas Akhir", type: 'offline' },
  { id: 'ba_bimbingan', label: "Berita Acara Bimbingan (TTD Pembimbing)", type: 'offline' },
  { id: 'transkrip_nilai', label: "Transkrip Nilai & Nilai Seminar (Disahkan Dosen Wali)", type: 'offline' },
  { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi", type: 'offline' },
  { id: 'sertifikat_toefl', label: "Sertifikat TOEFL (Skor min. 475)", type: 'offline' },
  { id: 'bukti_pembayaran', label: "Bukti Pembayaran Registrasi Semester Terakhir", type: 'offline' },
  { id: 'bebas_perpus', label: "Surat Bebas Pinjaman Perpustakaan (Univ & Fak)", type: 'offline' },
  { id: 'bukti_pengajuan_lengkap', label: "Bukti Pengajuan Topik, SUP, Seminar, Sidang", type: 'offline' },
  { id: 'jurnal_skripsi', label: "Print Out Jurnal Skripsi (Max 10 Halaman)", type: 'offline' },
  { id: 'sertifikat_publikasi', label: "Sertifikat Publikasi / Jurnal", type: 'offline' },
  { id: 'skpi_materai', label: "Surat Keterangan SKPI (Materai 10.000)", type: 'offline' },
  { id: 'biodata_sidang', label: "Biodata Sidang & Berkas Pendukung", type: 'offline' },
  { id: 'foto_sidang', label: "Pas Foto Hitam Putih Cerah 3x4 (6 Buah)", type: 'offline' },
  { id: 'surat_ijazah', label: "Surat Pengantar Pengambilan Ijazah", type: 'offline' },
  { id: 'print_skripsi', label: "Print Out Skripsi Belum Dijilid (3 Buah)", type: 'offline' },
  { id: 'flyer_sidang', label: "Flyer Skripsi Ukuran A3 (1 Buah)", type: 'offline' },
  { id: 'file_skripsi_final', label: "File Skripsi Final (Sistem PDF)", type: 'online' },
];

const normalizeStoragePath = (rawPath: string) => {
  if (!rawPath) return "";
  return rawPath.replace(/^docseminar\//gi, "").trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
};

// ================= FETCHER SWR =================
const fetchDetailTendikData = async (proposalId: string | null) => {
  if (!proposalId) return null;

  const { data: propData, error: propError } = await supabase
    .from("proposals")
    .select(`
      id, judul, status, status_lulus, user_id, 
      profiles!proposals_user_id_fkey (nama, npm), 
      seminar_requests ( id, tipe, status, approved_by_p1, approved_by_p2, created_at ),
      thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
      guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
    `)
    .eq("id", proposalId)
    .single();

  if (propError) throw propError;

  const { data: sidangData } = await supabase.from("sidang_requests").select("id, status").eq("proposal_id", proposalId).maybeSingle();
  const { data: docData } = await supabase.from("seminar_documents").select("*").eq("proposal_id", proposalId);
  const { data: sidangDocData } = await supabase.from("sidang_documents_verification").select("*").eq("proposal_id", proposalId);
  
  const currentDocs = docData || [];
  const verifiedDocsCount = currentDocs.filter(d => d.status === 'Lengkap').length;
  const activeSeminarReq = (propData.seminar_requests || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

  // 🔥 PERBAIKAN 1: Hitung bimbingan valid dan ACC dari kedua dosen
  let p1Count = 0;
  let p2Count = 0;
  const sessions = propData.guidance_sessions || [];

  propData.thesis_supervisors?.forEach((sp: any) => {
    const count = sessions.filter((s: any) => 
      s.dosen_id === sp.dosen_id && 
      s.kehadiran_mahasiswa === 'hadir' &&
      s.session_feedbacks?.[0]?.status_revisi === "disetujui"
    ).length || 0;

    if (sp.role === "utama" || sp.role === "pembimbing1") p1Count = count;
    else p2Count = count;
  });

  const approvedByAll = !!activeSeminarReq?.approved_by_p1 && !!activeSeminarReq?.approved_by_p2;
  
  let isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

  // Pastikan hanya force 'true' jika KEDUA dosen sudah ACC, atau tahapnya sudah lewat
  if (currentDocs.length > 0 || (activeSeminarReq && approvedByAll)) {
    isEligible = true;
  }
  // Logika Feedback & Kelayakan
  let isAllRevisiAcc = false;
  let hasFeedback = false;
  if (activeSeminarReq) {
    const [ { data: exms }, { data: fbs } ] = await Promise.all([
      supabase.from('examiners').select('dosen_id').eq('seminar_request_id', activeSeminarReq.id),
      supabase.from('seminar_feedbacks').select('status_revisi').eq('seminar_request_id', activeSeminarReq.id)
    ]);
    const totalDosen = (exms?.length || 0) + (propData.thesis_supervisors?.length || 0);
    const totalAcc = fbs?.filter((f: any) => f.status_revisi === 'diterima').length || 0;
    if (fbs && fbs.length > 0) hasFeedback = true;
    if (totalDosen > 0 && totalAcc >= totalDosen) isAllRevisiAcc = true;
  }

  // Map Tahap UI
  const ui = mapStatusToUI({
    proposalStatus: propData.status,
    hasSeminar: !!activeSeminarReq,
    seminarStatus: activeSeminarReq?.status,
    hasSidang: !!sidangData,
    uploadedDocsCount: currentDocs.length,
    verifiedDocsCount: verifiedDocsCount,
    isEligible: isEligible,
  });

  let finalTahap = ui.label;
  if (propData.status_lulus === true || propData.status === 'Lulus') {
    finalTahap = "Lulus";
  } else {
    if (activeSeminarReq?.status === 'Selesai' || hasFeedback) {
      finalTahap = isAllRevisiAcc ? "Pendaftaran Sidang Akhir" : "Perbaikan Pasca Seminar";
    }
    if (sidangData) {
      const sStatus = sidangData.status?.toLowerCase();
      finalTahap = (sStatus === 'lulus') ? "Lulus" : (sStatus === "menunggu_penjadwalan" || sStatus === "pending") ? "Pendaftaran Sidang Skripsi" : "Sidang Skripsi";
    }
  }

  const { data: bimData } = await supabase.from("guidance_sessions")
    .select(`id, sesi_ke, tanggal, dosen:profiles!guidance_sessions_dosen_id_fkey (nama), session_feedbacks!inner (status_revisi)`)
    .eq("proposal_id", proposalId).eq("kehadiran_mahasiswa", "hadir")
    .in("session_feedbacks.status_revisi", ["disetujui", "revisi"]).order("sesi_ke", { ascending: false });

  const profile = Array.isArray(propData.profiles) ? propData.profiles[0] : propData.profiles;

  return {
    student: {
      id: propData.id,
      judul: propData.judul,
      status_proposal: propData.status,
      user: { id: propData.user_id, nama: profile?.nama || "Tanpa Nama", npm: profile?.npm || "-" }
    },
    documents: currentDocs,
    sidangDocuments: sidangDocData || [],
    bimbingan: (bimData || []).map((b: any) => ({ id: b.id, sesi_ke: b.sesi_ke, tanggal: b.tanggal, dosen_nama: b.dosen?.nama || "-" })),
    tahap: finalTahap
  };
};

export default function DetailProgresTendikClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    proposalId ? `detail_progres_${proposalId}` : null,
    () => fetchDetailTendikData(proposalId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  const student = cache?.student || null;
  const documents = cache?.documents || [];
  const sidangDocuments = cache?.sidangDocuments || [];
  const bimbingan = cache?.bimbingan || [];
  const tahap = cache?.tahap || "Memuat...";

  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [docToReject, setDocToReject] = useState<{id: string, category: 'seminar' | 'sidang', label: string} | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const handleOpenRejectModal = (docId: string, category: 'seminar' | 'sidang', label: string) => {
    setDocToReject({ id: docId, category, label });
    setRejectReason("");
    setIsRejectModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleVerify = async (docId: string, newStatus: string, category: 'seminar' | 'sidang', reason?: string) => {
    if (newStatus === 'Lengkap') {
      if (!confirm(`Konfirmasi mengubah status menjadi Valid/Lengkap?`)) return;
    }
    
    setActiveDropdownId(null);
    setProcessingDoc(`${category}_${docId}`);
    
    try {
      const { data: auth } = await supabase.auth.getUser();
      const tableName = category === 'seminar' ? 'seminar_documents' : 'sidang_documents_verification';
      const docLabel = category === 'seminar' ? REQUIRED_DOCS.find(d => d.id === docId)?.label : SIDANG_DOCS.find(d => d.id === docId)?.label;

      await supabase.from(tableName).upsert({ 
        proposal_id: proposalId,
        nama_dokumen: docId,
        status: newStatus, 
        verified_at: new Date().toISOString(), 
        verified_by: auth.user?.id 
      }, { onConflict: 'proposal_id,nama_dokumen' });

      if (student?.user.id) {
        const title = newStatus === 'Lengkap' ? "Berkas Terverifikasi" : "Berkas Ditolak";
        let message = newStatus === 'Lengkap' 
          ? `Dokumen "${docLabel}" Anda telah diverifikasi oleh Tendik.`
          : `Dokumen "${docLabel}" Anda DITOLAK. Alasan: "${reason}". Silakan hapus dan unggah kembali berkas yang benar.`;
        await sendNotification(student.user.id, title, message);
      }

      mutate(); // 🔥 Refresh data SWR
      setIsRejectModalOpen(false);
    } catch (e) { 
      alert("Gagal update status dokumen."); 
    } finally { 
      setProcessingDoc(null); 
    }
  };

  const validSeminarCount = REQUIRED_DOCS.filter(reqDoc => documents.find(d => d.nama_dokumen === reqDoc.id || d.nama_dokumen === reqDoc.label)?.status === 'Lengkap').length;
  const seminarPercent = Math.min(100, Math.round((validSeminarCount / REQUIRED_DOCS.length) * 100));

  const validSidangCount = SIDANG_DOCS.filter(reqDoc => sidangDocuments.find(d => d.nama_dokumen === reqDoc.id || d.nama_dokumen === reqDoc.label)?.status === 'Lengkap').length;
  const sidangPercent = Math.min(100, Math.round((validSidangCount / SIDANG_DOCS.length) * 100));

  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] w-full z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#F8F9FB] relative">
        <div className="mb-6">
          <button onClick={() => router.back()} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-4">{student?.user.nama}</h1>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-black tracking-widest">{student?.user.npm}</span> 
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex-1 max-w-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={80}/></div>
            <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-[0.2em]">Judul Skripsi Terdaftar</p>
            <h2 className="text-lg font-black text-slate-800 leading-tight font-serif normal-case">"{student?.judul}"</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <ShieldCheck size={32}/>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verifikasi Total</p>
                  <p className="text-xl font-black text-slate-800">{validSeminarCount + validSidangCount} / {REQUIRED_DOCS.length + SIDANG_DOCS.length} Berkas</p>
                </div>
              </div>
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

            {/* TABEL DOKUMEN SEMINAR */}
            <div className="bg-white rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40 overflow-visible">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Manajemen Berkas Seminar</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400">Progres</span>
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${seminarPercent}%` }} />
                  </div>
                  <span className="text-xs font-black text-blue-600">{seminarPercent}%</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {REQUIRED_DOCS.map((doc) => {
                  const data = documents.find(d => d.nama_dokumen === doc.id || d.nama_dokumen === doc.label) || null;
                  const hasFile = !!data?.file_url;
                  const dropdownKey = `seminar_${doc.id}`;
                  const isProcessing = processingDoc === dropdownKey;
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-blue-50/20 transition-all group relative">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isProcessing ? 'bg-blue-100 text-blue-600' : data?.status === 'Lengkap' ? 'bg-emerald-100 text-emerald-600 shadow-inner' : data?.status === 'Ditolak' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-300'}`}>
                          {isProcessing ? <Clock size={24} className="animate-spin" /> : data?.status === 'Lengkap' ? <CheckCircle size={24} /> : <FileText size={24} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700 tracking-tight">{doc.label}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {isProcessing ? (<span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md text-blue-600 bg-blue-50">Memproses...</span>) : data ? (<span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${data.status === 'Lengkap' ? 'text-emerald-600 bg-emerald-50' : data.status === 'Ditolak' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>{data.status === 'Lengkap' ? 'Verified' : data.status === 'Ditolak' ? 'Rejected' : 'Pending'}</span>) : (<span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100">Belum Diserahkan</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 dropdown-container">
                          <div className="relative">
                            <button onClick={() => setActiveDropdownId(activeDropdownId === dropdownKey ? null : dropdownKey)} disabled={isProcessing} className={`p-3 rounded-xl border transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${activeDropdownId === dropdownKey ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-blue-400 hover:text-blue-600'}`}><MoreHorizontal size={20} /></button>
                            {activeDropdownId === dropdownKey && (
                              <div className="absolute right-0 top-12 w-60 bg-white rounded-[1.5rem] shadow-2xl border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 space-y-1">
                                  {hasFile && (
                                    <>
                                      <button onClick={() => handleActionFile(data.file_url, false)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Eye size={16} className="text-slate-400" /> Lihat Berkas</button>
                                      <button onClick={() => handleActionFile(data.file_url, true)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Download size={16} className="text-slate-400" /> Unduh PDF</button>
                                      <div className="h-px bg-slate-50 my-1 mx-2" />
                                    </>
                                  )}
                                  <button onClick={() => handleVerify(doc.id, 'Lengkap', 'seminar')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition uppercase tracking-widest"><CheckCircle size={16} /> Verifikasi Valid</button>
                                  <button onClick={() => handleOpenRejectModal(doc.id, 'seminar', doc.label)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-red-600 hover:bg-red-50 rounded-xl transition uppercase tracking-widest"><XCircle size={16} /> Tolak / Batal</button>
                                </div>
                              </div>
                            )}
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABEL DOKUMEN SIDANG */}
            <div className="bg-white rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40 overflow-visible">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Manajemen Berkas Sidang</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400">Progres</span>
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${sidangPercent}%` }} />
                  </div>
                  <span className="text-xs font-black text-blue-600">{sidangPercent}%</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {SIDANG_DOCS.map((doc) => {
                  const data = sidangDocuments.find(d => d.nama_dokumen === doc.id || d.nama_dokumen === doc.label) || null;
                  const status = data?.status || 'Belum Diserahkan';
                  const isComplete = status === 'Lengkap';
                  const isRejected = status === 'Ditolak';
                  const hasFile = doc.type === 'online' && !!data?.file_url;
                  const dropdownKey = `sidang_${doc.id}`;
                  const isProcessing = processingDoc === dropdownKey;
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-blue-50/20 transition-all group relative">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isProcessing ? 'bg-blue-100 text-blue-600' : isComplete ? 'bg-emerald-100 text-emerald-600 shadow-inner' : isRejected ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-300'}`}>
                          {isProcessing ? <Clock size={24} className="animate-spin" /> : isComplete ? <CheckCircle size={24} /> : <FileText size={24} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700 tracking-tight">{doc.label}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {isProcessing ? (<span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md text-blue-600 bg-blue-50">Memproses...</span>) : data && status !== 'Belum Diserahkan' ? (<span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isComplete ? 'text-emerald-600 bg-emerald-50' : isRejected ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>{isComplete ? 'Verified' : isRejected ? 'Rejected' : 'Pending'}</span>) : (<span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100">Belum Diserahkan</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 dropdown-container">
                          <div className="relative">
                            <button onClick={() => setActiveDropdownId(activeDropdownId === dropdownKey ? null : dropdownKey)} disabled={isProcessing} className={`p-3 rounded-xl border transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${activeDropdownId === dropdownKey ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-blue-400 hover:text-blue-600'}`}><MoreHorizontal size={20} /></button>
                            {activeDropdownId === dropdownKey && (
                              <div className="absolute right-0 top-12 w-60 bg-white rounded-[1.5rem] shadow-2xl border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 space-y-1">
                                  {hasFile && data && (
                                    <>
                                      <button onClick={() => handleActionFile(data.file_url, false)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Eye size={16} className="text-slate-400" /> Lihat Berkas</button>
                                      <button onClick={() => handleActionFile(data.file_url, true)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Download size={16} className="text-slate-400" /> Unduh PDF</button>
                                      <div className="h-px bg-slate-50 my-1 mx-2" />
                                    </>
                                  )}
                                  <button onClick={() => handleVerify(doc.id, 'Lengkap', 'sidang')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition uppercase tracking-widest"><CheckCircle size={16} /> Verifikasi Valid</button>
                                  <button onClick={() => handleOpenRejectModal(doc.id, 'sidang', doc.label)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-red-600 hover:bg-red-50 rounded-xl transition uppercase tracking-widest"><XCircle size={16} /> Tolak / Batal</button>
                                </div>
                              </div>
                            )}
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Bimbingan */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl text-white sticky top-28 overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><Clock size={120}/></div>
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8 relative z-10">Riwayat Bimbingan</h3>
              <div className="space-y-8 relative z-10">
                {bimbingan.length === 0 ? (<div className="py-10 text-center opacity-30 font-black uppercase tracking-widest text-xs">Belum Ada Riwayat Bimbingan</div>) : bimbingan.map((sesi, idx) => (
                  <div key={idx} className="relative pl-8 border-l-2 border-white/10 last:border-0 pb-4">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-900" />
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Sesi {sesi.sesi_ke}</p>
                    <p className="text-sm font-black tracking-tight mb-2">{sesi.dosen_nama}</p>
                    <div className="flex items-center gap-2 text-white/40"><Clock size={12} /><span className="text-[10px] font-bold">{new Date(sesi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL PENOLAKAN */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center"><XCircle size={24} /></div>
              <div><h3 className="text-xl font-black text-slate-800 tracking-tight">Tolak Dokumen</h3><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Beri Catatan</p></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 mt-4 border border-slate-100"><p className="text-xs font-black text-slate-700 leading-relaxed">"{docToReject?.label}"</p></div>
            <div className="space-y-4">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alasan Penolakan</label><textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Misal: Format file salah, TTD kurang jelas, dll..." className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all resize-none shadow-sm" /></div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={() => setIsRejectModalOpen(false)} className="flex-1 py-3.5 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm">Batal</button>
                <button onClick={() => handleVerify(docToReject!.id, 'Ditolak', docToReject!.category, rejectReason)} disabled={!rejectReason.trim()} className="flex-1 py-3.5 px-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed">Kirim Penolakan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}