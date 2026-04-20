"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { 
  Search, Bell, ArrowLeft, FileText, 
  ShieldCheck, Clock, Layers, LayoutDashboard
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from '@/components/notificationBell';

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

// ================= FETCHER SWR =================
const fetchDetailProgresData = async (proposalId: string | null) => {
  if (!proposalId) return null;

  // 1. Fetch Data Proposal dengan relasi bimbingan yang LENGKAP
  const { data: propData, error: propError } = await supabase
    .from("proposals")
    .select(`
      id, judul, status, status_lulus,
      user:profiles!proposals_user_id_fkey (nama, npm),
      seminar_requests ( 
        id, tipe, status, approved_by_p1, approved_by_p2, created_at 
      ),
      thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
      guidance_sessions ( 
        id, sesi_ke, tanggal, dosen_id, 
        kehadiran_mahasiswa, 
        dosen:profiles!guidance_sessions_dosen_id_fkey ( nama ),
        session_feedbacks ( status_revisi ) 
      )
    `)
    .eq("id", proposalId)
    .single();

  if (propError) throw propError;

  // 2. Query Sidang (RLS Safe Check)
  const { data: sidangData } = await supabase
    .from("sidang_requests")
    .select("id, status")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  const hasSidangFound = !!sidangData;

  // 3. Set Data Mahasiswa
  const user = Array.isArray(propData.user) ? propData.user[0] : propData.user;
  const studentData: StudentDetail = {
    id: propData.id,
    judul: propData.judul,
    user: { nama: user?.nama ?? "Tanpa Nama", npm: user?.npm ?? "-" },
  };

  // 4. Logika Bimbingan P1 & P2
  const allSeminarReqs = propData.seminar_requests || [];
  const activeSeminarReq = allSeminarReqs.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] || null;

  let hasFeedback = false;
  let isAllRevisiAcc = false;

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

  // LOGIKA FILTER BIMBINGAN JAVASCRIPT
  const sessions = propData.guidance_sessions || [];
  const validSessions = sessions.filter((s: any) => {
    if (s.kehadiran_mahasiswa !== 'hadir') return false;
    const latestStatus = s.session_feedbacks?.[0]?.status_revisi;
    return latestStatus === 'disetujui' || latestStatus === 'revisi';
  });

  let p1Count = 0;
  let p2Count = 0;

  propData.thesis_supervisors?.forEach((sp: any) => {
    const count = validSessions.filter((s: any) => s.dosen_id === sp.dosen_id).length;
    if (sp.role === "utama" || sp.role === "pembimbing1") p1Count = count;
    else p2Count = count;
  });

  // 5. Fetch Berkas Seminar
  const { data: docData } = await supabase.from("seminar_documents").select("*").eq("proposal_id", proposalId);
  const currentDocs = docData || [];
  const verifiedDocsCount = currentDocs.filter(d => d.status === 'Lengkap').length;

  // 6. Hitung Kelayakan & Panggil Mapper Global
  const approvedByAll = !!activeSeminarReq?.approved_by_p1 && !!activeSeminarReq?.approved_by_p2;
  // 🔥 PERBAIKAN 1: Gunakan && (DAN). Harus bimbingan 10x DAN di-ACC keduanya.
let isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;
let hasSeminar = !!activeSeminarReq;

// 🔥 PERBAIKAN 2: Hanya force true jika dokumen diunggah ATAU seminar sudah di-ACC kedua dosen.
if (currentDocs.length > 0 || (activeSeminarReq && approvedByAll)) {
  isEligible = true;
  hasSeminar = true;
}

  const ui = mapStatusToUI({
    proposalStatus: propData.status,
    hasSeminar: hasSeminar,
    seminarStatus: activeSeminarReq?.status,
    hasSidang: hasSidangFound,
    uploadedDocsCount: currentDocs.length,
    verifiedDocsCount: verifiedDocsCount,
    isEligible: isEligible, 
  });

  let finalTahap = ui.label;
  
  if (propData.status_lulus === true || propData.status === 'Lulus') {
    finalTahap = "Lulus";
  } else {
    if (activeSeminarReq?.status === 'Selesai' || hasFeedback) {
      finalTahap = "Perbaikan Pasca Seminar"; 
      if (isAllRevisiAcc) finalTahap = "Pendaftaran Sidang Akhir";
    }
    
   if (sidangData) {
       const sidangStatus = sidangData.status?.toLowerCase();
       
       if (sidangStatus === 'lulus') {
         finalTahap = "Lulus";
       } 
       else if (sidangStatus === "menunggu_penjadwalan" || sidangStatus === "pending") {
         finalTahap = "Pendaftaran Sidang Skripsi";
       } 
       else {
         finalTahap = "Sidang Skripsi";
       }
    }
  }

  // 7. Sidebar Riwayat Bimbingan (Hanya yang di-ACC atau REVISI)
  const { data: bimDataHistory } = await supabase
    .from("guidance_sessions")
    .select(`
      id, sesi_ke, tanggal, 
      dosen:profiles!guidance_sessions_dosen_id_fkey (nama), 
      session_feedbacks!inner(status_revisi)
    `)
    .eq("proposal_id", proposalId)
    .eq("kehadiran_mahasiswa", "hadir")
    .in("session_feedbacks.status_revisi", ["disetujui", "revisi"])
    .order("sesi_ke", { ascending: false });

  const bimbinganList: GuidanceSession[] = (bimDataHistory || []).map((b: any) => ({
    id: b.id, 
    sesi_ke: b.sesi_ke, 
    tanggal: b.tanggal, 
    dosen_nama: b.dosen?.nama || "-"
  }));

  return {
    student: studentData,
    tahap: finalTahap,
    bimbingan: bimbinganList
  };
};

export default function DetailProgresKaprodiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading } = useSWR(
    proposalId ? `detail_progres_kaprodi_${proposalId}` : null,
    () => fetchDetailProgresData(proposalId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // Extract cache data
  const student = cache?.student || null;
  const tahap = cache?.tahap || "Proses Bimbingan";
  const bimbingan = cache?.bimbingan || [];

  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans text-slate-700 overflow-hidden">
      <div className="flex-1 flex flex-col h-full">
        <main className="flex-1 p-10 overflow-y-auto custom-scrollbar">

          <div className="mb-10 outline-none focus:outline-none">
            <button 
              onClick={() => router.back()} 
              className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95 outline-none focus:outline-none"
            >
              {/* Kotak Putih Arrow */}
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0 outline-none focus:outline-none">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform outline-none focus:outline-none" />
              </div>
              
              {/* Teks Label */}
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors outline-none focus:outline-none">
                Kembali ke progres semua mahasiswa 
              </span>
            </button>
          </div>

          {/* PROFILE CARD */}
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

            {/* RIGHT SIDEBAR RIWAYAT BIMBINGAN */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl text-white sticky top-28 overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><Clock size={120}/></div>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8 relative z-10">Riwayat Bimbingan</h3>
                <div className="space-y-8 relative z-10">
                  {bimbingan.length === 0 ? (
                    <div className="py-10 text-center opacity-30 font-black uppercase tracking-widest text-xs">Belum Ada Riwayat Bimbingan</div>
                  ) : bimbingan.map((sesi, idx) => (
                    <div key={idx} className="relative pl-8 border-l-2 border-white/10 last:border-0 pb-4">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-900" />
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Sesi {sesi.sesi_ke}</p>
                      <p className="text-sm font-black tracking-tight mb-2">{sesi.dosen_nama}</p>
                      <div className="flex items-center gap-2 text-white/40">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold">{new Date(sesi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}