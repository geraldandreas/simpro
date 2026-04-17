"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr'; // 🚀 Import SWR
import { supabase } from '@/lib/supabaseClient';
import { sendNotification } from "@/lib/notificationUtils";
import Image from "next/image";
import { 
  ArrowLeft, Download, FileText, UploadCloud, 
  Save, User, AlertCircle, CheckCircle, Lock 
} from 'lucide-react';

// --- TYPES ---
interface SessionFeedback {
  id: string;
  komentar: string;
  file_url: string | null;
  status_revisi: string;
  created_at: string;
  dosen: {
    id: string;
    nama: string;
  };
}

interface SessionDetail {
  id: string;
  sesi_ke: number;
  tanggal: string;
  jam: string;
  metode: string;
  hasil_bimbingan: string; 
  status: string; 
  kehadiran_mahasiswa: string; 
  dosen_id: string;
  proposal: {
    id: string; 
    judul: string;
    mahasiswa: {
      nama: string;
      npm: string;
      avatar_url?: string | null;
    };
  };
  dosen: {
    nama: string;
  };
  drafts?: {
      id: string;
      file_url: string;
      uploaded_at: string;
      catatan: string | null;
  }[];
}

export default function SesiBimbinganKaprodiClient() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center h-screen relative z-10 bg-[#F8F9FB]">
         <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </main>
    }>
      <DetailBimbinganDosen />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchSessionDetail = async (sessionId: string | null) => {
  if (!sessionId) return null;

  // 1. Fetch Session Data
  const { data: sessionData, error } = await supabase
    .from("guidance_sessions")
    .select(`
      *,
      proposal:proposals (
        id,
        judul,
        mahasiswa:profiles (nama, npm, avatar_url)
      ),
      dosen:profiles!guidance_sessions_dosen_id_fkey (nama),
      drafts:session_drafts (id, file_url, uploaded_at, catatan)
    `)
    .eq("id", sessionId)
    .single();

  if (error) throw error;

  // 2. Fetch Valid Guidance Count
  const { data: allSessions } = await supabase
    .from("guidance_sessions")
    .select(`id, kehadiran_mahasiswa, session_feedbacks (status_revisi, created_at)`)
    .eq("proposal_id", sessionData.proposal.id)
    .eq("dosen_id", sessionData.dosen_id);

  const validCount = allSessions?.filter(s => {
    const latest = s.session_feedbacks?.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return s.kehadiran_mahasiswa === "hadir" && 
           (latest?.status_revisi === "disetujui" || latest?.status_revisi === "revisi");
  }).length || 0;

  // 3. Fetch Feedback Dosen
  const { data: feedbackData, error: feedbackError } = await supabase
    .from("session_feedbacks")
    .select(`id, komentar, file_url, status_revisi, created_at, dosen:profiles (id, nama)`)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (feedbackError) throw feedbackError;
  const latestFeedback = feedbackData?.[0] ?? null;

  // 4. Check Seminar Status (Lock Logic)
  let isSeminarApproved = false;
  if (sessionData.proposal?.id) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: supervisor } = await supabase
        .from("thesis_supervisors")
        .select("role")
        .eq("proposal_id", sessionData.proposal.id)
        .eq("dosen_id", user.id)
        .single();

      const { data: seminarReq } = await supabase
        .from('seminar_requests')
        .select('status, approved_by_p1, approved_by_p2')
        .eq('proposal_id', sessionData.proposal.id)
        .maybeSingle();
      
      if (seminarReq && supervisor) {
        const role = supervisor.role;
        const isP1 = role === "utama" || role === "pembimbing1";
        
        if (
          seminarReq.status === 'Disetujui' || 
          (isP1 && seminarReq.approved_by_p1) || 
          (!isP1 && seminarReq.approved_by_p2)
        ) {
          isSeminarApproved = true;
        }
      }
    }
  }

  return {
    session: sessionData as SessionDetail,
    validGuidanceCount: validCount,
    latestFeedback,
    isSeminarApproved
  };
};

function DetailBimbinganDosen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    sessionId ? `bimbingan_dosen_detail_${sessionId}` : null,
    () => fetchSessionDetail(sessionId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const session = cache?.session || null;
  const validGuidanceCount = cache?.validGuidanceCount || 0;
  const latestFeedback = cache?.latestFeedback || null;
  
  // --- LOCAL STATE (Sync from Cache) ---
  const [saving, setSaving] = useState(false);
  const [isSeminarApproved, setIsSeminarApproved] = useState(false); 

  const [komentar, setKomentar] = useState("");
  const [kehadiran, setKehadiran] = useState<string | null>(null);
  const [statusSesi, setStatusSesi] = useState<string | null>(null);       
  const [statusRevisi, setStatusRevisi] = useState<string | null>(null);   
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileBalasan, setFileBalasan] = useState<File | null>(null);
  
  useEffect(() => {
    if (cache) {
      setKehadiran(cache.session.kehadiran_mahasiswa || null);
      setStatusSesi(cache.session.status);
      setIsSeminarApproved(cache.isSeminarApproved);

      if (cache.latestFeedback) {
        setFeedbackId(cache.latestFeedback.id);
        setKomentar(cache.latestFeedback.komentar || "");
        setStatusRevisi(cache.latestFeedback.status_revisi || null);
        setExistingFileUrl(cache.latestFeedback.file_url || null);
      }
    }
  }, [cache]);

  // --- ACTIONS ---
  const handleDownloadDraft = async (fileUrl: string) => {
    try {
      const path = fileUrl.split("/draftsession/")[1];
      if (!path) throw new Error("Path file tidak valid");

      const { data, error } = await supabase.storage
        .from("draftsession")
        .createSignedUrl(path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file");
    }
  };

  const handleDownloadFeedback = async (fileUrl: string) => {
    try {
      const path = fileUrl.split("feedback_draft/")[1];
      if (!path) throw new Error("Path file tidak valid");

      const { data, error } = await supabase.storage
        .from("feedback_draft")
        .createSignedUrl(path, 3600);
      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file");
    }
  };

  const handleSave = async () => {
    if (!sessionId || !session) return;
    if (!kehadiran) return alert("❗ Tentukan kehadiran mahasiswa terlebih dahulu");
    if (!statusRevisi) return alert("❗ Tentukan status bimbingan Mahasiswa (selesai / revisi)");

    setSaving(true);
    try {
      let fileUrl: string | null = existingFileUrl ?? null;

      if (fileBalasan) {
        const filePath = `${sessionId}/${Date.now()}_${fileBalasan.name}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback_draft")
          .upload(filePath, fileBalasan);

        if (uploadError) throw uploadError;
        fileUrl = `feedback_draft/${filePath}`;
      }

      if (feedbackId) {
        await supabase
          .from("session_feedbacks")
          .update({
            komentar,
            file_url: fileUrl,
            status_revisi: statusRevisi,
          })
          .eq("id", feedbackId);
      } else {
        await supabase
          .from("session_feedbacks")
          .insert({
            session_id: sessionId,
            dosen_id: (await supabase.auth.getUser()).data.user?.id,
            komentar,
            file_url: fileUrl,
            status_revisi: statusRevisi,
          });
      }

      await supabase
        .from("guidance_sessions")
        .update({
          status: "selesai", 
          kehadiran_mahasiswa: kehadiran,
        })
        .eq("id", sessionId);

      if (session.proposal?.id) {
        const { data: student } = await supabase
          .from("proposals")
          .select("user_id")
          .eq("id", session.proposal.id)
          .single();

        if (student?.user_id) {
          const statusLabel = statusRevisi === "disetujui" ? "ACC DRAFT" : "PERLU REVISI";
          const adaFile = fileBalasan || existingFileUrl;
          const infoFile = adaFile ? " beserta dokumen perbaikan" : "";
          const infoHadir = kehadiran === "hadir" ? "HADIR" : "TIDAK HADIR";

          await sendNotification(
            student.user_id,
            "Update Feedback Bimbingan",
            `Dosen ${session.dosen.nama} memberikan status ${statusLabel}${infoFile} (Status Kehadiran: ${infoHadir}) untuk Sesi ke-${session.sesi_ke}.`
          );
        }
      }

      alert("✅ Feedback dan Kehadiran berhasil disimpan");
      setFileBalasan(null);
      mutate(); // 🔥 Refresh SWR Cache
    } catch (err: any) {
      console.error(err);
      alert("❌ Gagal menyimpan feedback");
    } finally {
      setSaving(false);
    }
  };

  const handleAccSeminar = async () => {
    if (!session?.proposal?.id) return;
    if (!confirm("Apakah Anda yakin ingin meng-ACC mahasiswa ini untuk Seminar?")) return;

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak login");

      const { data: supervisor } = await supabase
        .from("thesis_supervisors")
        .select("role")
        .eq("proposal_id", session.proposal.id)
        .eq("dosen_id", user.id)
        .single();

      if (!supervisor) throw new Error("Anda bukan pembimbing mahasiswa ini");

      const role = supervisor.role;

      const { data: existing } = await supabase
        .from("seminar_requests")
        .select("id")
        .eq("proposal_id", session.proposal.id)
        .maybeSingle();

      let seminarRequestId: string;

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from("seminar_requests")
          .insert({
            proposal_id: session.proposal.id,
            tipe: "seminar",
            status: "draft",
            approved_by_p1: role === "utama" || role === "pembimbing1",
            approved_by_p2: role === "pendamping",
          })
          .select("id")
          .single();

        if (error) throw error;
        seminarRequestId = inserted.id;

      } else {
        seminarRequestId = existing.id;
        const { error } = await supabase
          .from("seminar_requests")
          .update(
            role === "utama" || role === "pembimbing1"
              ? { approved_by_p1: true }
              : { approved_by_p2: true }
          )
          .eq("id", seminarRequestId);

        if (error) throw error;
      }

      alert("✅ ACC Seminar berhasil dicatat");
      
      setIsSeminarApproved(true);
      mutate(); // 🔥 Refresh SWR Cache

      const { data: student } = await supabase
        .from("proposals")
        .select("user_id")
        .eq("id", session.proposal.id)
        .single();

      if (student?.user_id) {
        await sendNotification(
          student.user_id,
          "ACC Seminar",
          `Dosen ${session.dosen.nama} telah memberikan ACC Seminar kepada Anda.`
        );
      }

    } catch (err: any) {
      console.error(err);
      alert("❌ Gagal ACC Seminar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ================= UI RENDER =================
  if (!sessionId) return null;
  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6 shadow-inner relative overflow-hidden">
            <AlertCircle size={32} className="relative z-10" />
            <div className="absolute w-full h-full bg-gradient-to-tr from-transparent to-slate-50 opacity-50"></div>
          </div>
          <h2 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Sesi Tidak Ditemukan</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs mb-8">
            Data sesi bimbingan yang Anda cari tidak ada di sistem atau akses ditolak.
          </p>
          
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-4 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
              Kembali ke Detail Bimbingan Mahasiswa
            </span>
          </button>
        </div>
      </div>
    );
  }

  const draft = session.drafts?.[0] ?? null;

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <main className="flex-1 p-8 flex flex-col h-screen overflow-y-auto">
        
        {/* Header Nav */}
        <div className="mb-10">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
              Kembali ke Detail Bimbingan Mahasiswa
            </span>
          </button>

          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
            Sesi Bimbingan {session.sesi_ke}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI (DETAIL UTAMA) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Info Mahasiswa */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-start gap-5">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0 overflow-hidden relative border border-blue-200 shadow-inner">
                {session.proposal.mahasiswa.avatar_url ? (
                  <Image 
                    src={session.proposal.mahasiswa.avatar_url} 
                    alt={session.proposal.mahasiswa.nama || "User"} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  session.proposal.mahasiswa.nama.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{session.proposal.mahasiswa.nama}</h2>
                <p className="text-sm text-gray-500 font-medium mb-2">{session.proposal.mahasiswa.npm}</p>
                <p className="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  "{session.proposal.judul}"
                </p>
                <div className="mt-4 flex gap-6 text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-500"/>
                    Pembimbing: {session.dosen.nama}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Dokumen & Catatan Mahasiswa */}
            <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm transition-all ${isSeminarApproved ? 'grayscale-[0.2]' : ''}`}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dokumen Mahasiswa</h3>
              
              {draft ? (
                <div className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {decodeURIComponent(draft.file_url.split("/").pop() || "").replace(/%20/g, " ")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Diunggah:{" "}
                        {new Date(draft.uploaded_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDraft(draft.file_url)}
                    className="bg-[#365b8e] hover:bg-[#2a466f] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-2"
                  >
                    <Download size={16} /> Unduh
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-6 text-gray-400">
                  <AlertCircle size={24} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">
                    Mahasiswa belum mengunggah dokumen draft.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="text-sm font-bold text-gray-700 block mb-2">Catatan dari Mahasiswa</label>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 min-h-[80px]">
                  {session.drafts?.[0]?.catatan || "-"}
                </div>
              </div>

              {/* 🔥 KEPUTUSAN SESI: DI-LOCK JIKA SEMINAR ACC 🔥 */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-bold text-gray-900 mb-3">Keputusan Sesi Ini</p>
                <div className="flex items-center gap-6">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSeminarApproved ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' :
                    statusRevisi === 'disetujui' ? 'bg-green-50 border-green-200 cursor-pointer' : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input 
                      type="radio" 
                      name="status" 
                      disabled={isSeminarApproved}
                      checked={statusRevisi === 'disetujui'}
                      onChange={() => setStatusRevisi('disetujui')}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 disabled:cursor-not-allowed"
                    />
                    <span className={`text-sm font-bold ${statusRevisi === 'disetujui' ? 'text-green-700' : 'text-gray-600'}`}>
                      ACC Draft
                    </span>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSeminarApproved ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' :
                    statusRevisi === 'revisi' ? 'bg-orange-50 border-orange-200 cursor-pointer' : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input 
                      type="radio" 
                      name="status" 
                      disabled={isSeminarApproved}
                      checked={statusRevisi === 'revisi'}
                      onChange={() => setStatusRevisi('revisi')}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-400 border-gray-300 disabled:cursor-not-allowed"
                    />
                    <span className={`text-sm font-bold ${statusRevisi === 'perlu_revisi' ? 'text-orange-700' : 'text-gray-600'}`}>
                      Perlu Revisi
                    </span>
                  </label>
                </div>
              </div>

              {/* 🔥 KEHADIRAN MAHASISWA: DI-LOCK JIKA SEMINAR ACC 🔥 */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-3">Kehadiran Mahasiswa</p>
                <div className="flex gap-3">
                  <button 
                    disabled={isSeminarApproved}
                    onClick={() => setKehadiran('hadir')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold border transition ${
                      isSeminarApproved ? 'opacity-60 cursor-not-allowed' : ''
                    } ${kehadiran === 'hadir' ? 'bg-[#588d7f] text-white border-[#588d7f] shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Hadir
                  </button>
                  <button 
                    disabled={isSeminarApproved}
                    onClick={() => setKehadiran('tidak_hadir')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold border transition ${
                      isSeminarApproved ? 'opacity-60 cursor-not-allowed' : ''
                    } ${kehadiran === 'tidak_hadir' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Tidak Hadir
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* KOLOM KANAN (FEEDBACK & ACC SEMINAR) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* === NEW: ACC SEMINAR BUTTON (CONDITIONAL) === */}
            {!isSeminarApproved && (
              validGuidanceCount >= 10 ? (
                <div className="bg-[#eff6ff] rounded-2xl border border-blue-200 p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-sm font-bold text-blue-900">Kelayakan Seminar</h3>
                      <p className="text-xs text-blue-700 mt-1">
                        Mahasiswa memiliki {validGuidanceCount} bimbingan valid. Syarat terpenuhi untuk memberikan ACC.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAccSeminar}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all active:scale-95"
                  >
                    {saving ? "Memproses..." : "ACC Seminar"}
                  </button>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-orange-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-sm font-bold text-orange-900">Akses Seminar Terkunci</h3>
                      <p className="text-[11px] text-orange-700 mt-1">
                        Bimbingan Valid: {validGuidanceCount}/10. <br/>
                        Sesi dianggap sah jika mahasiswa <b>Hadir</b> dan telah diberikan keputusan review.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* === ALREADY APPROVED INFO === */}
            {isSeminarApproved && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6 shadow-sm flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <h3 className="text-sm font-bold text-green-900">Seminar Disetujui</h3>
                  <p className="text-xs text-green-700">Mahasiswa sudah di-ACC untuk seminar.</p>
                </div>
              </div>
            )}

           {/* File Upload Balasan & Display */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">File Balasan Dosen</h3>
            
            {/* 1. TAMPILAN FILE YANG SUDAH TERUPLOAD DI DATABASE */}
            {existingFileUrl && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-blue-900 truncate">
                      {(() => {
                        const fileName = decodeURIComponent(existingFileUrl?.split("/").pop() || "").replace(/%20/g, " ");
                        return fileName.includes("_") ? fileName.split("_").slice(1).join("_") : fileName;
                      })()}
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium">File telah dikirim</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadFeedback(existingFileUrl)}
                    className="text-blue-700 hover:text-blue-900 p-2 transition"
                    title="Unduh File"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. AREA UNGGAH FILE (Hanya muncul jika BELUM ada file di database) */}
            {!existingFileUrl && (
              isSeminarApproved ? (
                /* 🔥 JIKA SUDAH ACC SEMINAR, TAMPILKAN STATE TERKUNCI 🔥 */
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-6 text-gray-400">
                  <Lock size={24} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium text-center">Sesi terkunci.<br/>Tidak dapat mengunggah dokumen baru.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                      fileBalasan 
                        ? "border-green-300 bg-green-50" 
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-3 group-hover:scale-110 transition-transform ${
                      fileBalasan ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-500"
                    }`}>
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-xs font-bold text-gray-700 mb-1">
                      {fileBalasan ? fileBalasan.name : "Klik untuk upload file balasan"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {fileBalasan ? "File siap diunggah" : "PDF / DOCX (Max 5MB)"}
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={(e) => setFileBalasan(e.target.files?.[0] || null)} 
                    />
                  </div>

                  {fileBalasan && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setFileBalasan(null); 
                      }} 
                      className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg transition"
                    >
                      Batalkan Pilihan
                    </button>
                  )}
                </div>
              )
            )}

            {/* TOMBOL BATALKAN UPLOAD BARU */}
            {fileBalasan && !isSeminarApproved && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setFileBalasan(null); 
                }} 
                className="mt-3 w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg transition"
              >
                Batalkan Perubahan File
              </button>
            )}
          </div>
                
            {/* Komentar Dosen */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User size={16} className="text-gray-500"/>
                </div>
                <p className="text-sm font-bold text-gray-800">{session.dosen.nama}</p>
              </div>
              
              <div className="relative">
                {/* 🔥 TEXTAREA DI-LOCK JIKA SEMINAR ACC 🔥 */}
                <textarea
                  value={komentar}
                  disabled={isSeminarApproved}
                  onChange={(e) => setKomentar(e.target.value)}
                  placeholder={isSeminarApproved ? "Komentar sesi ini telah dikunci..." : "Tuliskan komentar, masukan, atau revisi untuk mahasiswa..."}
                  className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-h-[200px] resize-none transition disabled:bg-gray-50 disabled:text-gray-400"
                />
                {isSeminarApproved && (
                  <div className="absolute top-4 right-4 text-gray-300">
                    <Lock size={18} />
                  </div>
                )}
              </div>

              {/* 🔥 TOMBOL SIMPAN DI-LOCK JIKA SEMINAR ACC 🔥 */}
              <button 
                onClick={handleSave}
                disabled={saving || isSeminarApproved}
                className={`mt-4 w-full text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 
                  ${isSeminarApproved 
                    ? 'bg-gray-400 cursor-not-allowed shadow-none opacity-80' 
                    : 'bg-[#3b608a] hover:bg-[#2a466f] active:scale-95 disabled:opacity-70'}`}
              >
                {isSeminarApproved 
                  ? <><Lock size={18} /> Sesi Terkunci</> 
                  : saving ? "Menyimpan..." : <><Save size={18} /> Simpan Hasil Bimbingan</>}
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}