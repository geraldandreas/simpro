"use client";

import React, { useRef, useState } from 'react';
import useSWR from 'swr'; // 🔥 Import SWR
import { sendNotification } from "@/lib/notificationUtils";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  Check, X, Clock,
  AlertCircle, Lock, CloudUpload, ChevronRight,
  ShieldCheck, FileText, 
  CheckCircle2
} from 'lucide-react';

interface DocumentData {
  id?: string;
  status: string;
  file_url?: string;
}

// ================= LIST DOKUMEN =================
const seminarDocs = [
  { id: 'form_layak_dan_jadwal', label: "Form Layak Seminar & Pengajuan Jadwal", sub: "Langkah 1: Upload PDF" },
  { id: 'nilai_magang_gabungan', label: "Form Nilai Magang (Dosen Wali & Lapangan)", sub: "Langkah 2: Upload PDF" },
  { id: 'bukti_serah_magang', label: "Bukti Penyerahan Laporan Magang", sub: "Langkah 3: Upload PDF" },
  { id: 'draft_skripsi', label: "Draft Skripsi (Untuk Dosen Penguji)", sub: "Langkah 4: Upload PDF " },
];
const totalDocs = 4; 

// ================= FETCHER SWR =================
const fetcher = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Ambil Proposal ID
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!proposal) return null;

  // 2. Fetch parallel untuk efisiensi
  const [
    { data: seminar },
    { data: supervisors },
    { data: sessions },
    { data: docs }
  ] = await Promise.all([
    supabase.from('seminar_requests').select('status, approved_by_p1, approved_by_p2').eq('proposal_id', proposal.id).maybeSingle(),
    supabase.from('thesis_supervisors').select('dosen_id, role').eq('proposal_id', proposal.id),
    supabase.from('guidance_sessions').select(`dosen_id, session_feedbacks (status_revisi)`).eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir'),
    supabase.from('seminar_documents').select('*').eq('proposal_id', proposal.id)
  ]);

  const approvedByAll = seminar?.approved_by_p1 === true && seminar?.approved_by_p2 === true;

  let p1 = 0, p2 = 0;
  supervisors?.forEach(sp => {
    // 🔥 LOGIKA BARU: Dihitung valid JIKA HADIR (sudah difilter di query Supabase baris 41) 
    // DAN status revisinya ADA (disetujui ATAU revisi)
    const validSessions = sessions?.filter((s: any) => {
      if (s.dosen_id !== sp.dosen_id) return false;
      const latestStatus = s.session_feedbacks?.[0]?.status_revisi;
      return latestStatus === 'disetujui' || latestStatus === 'revisi';
    }) || [];
    
    if (sp.role === 'utama' || sp.role === 'pembimbing1') p1 = validSessions.length;
    else p2 = validSessions.length;
  });

  const isEligible = p1 >= 10 && p2 >= 10 && approvedByAll;

  const documentsMap: { [key: string]: DocumentData } = {};
  if (docs) {
    docs.forEach(d => documentsMap[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
  }

  return {
    proposalId: proposal.id,
    seminarStatus: seminar?.status || null,
    isAccDosen: approvedByAll,
    bimbinganCount: { p1, p2 },
    isEligible,
    documentsMap,
    userId: user.id
  };
};

export default function UploadDokumenClient() {
  const router = useRouter();
  
  // State khusus form submit (agar tombol disable saat diproses)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data, error, isLoading, mutate } = useSWR('upload_dokumen_mhs', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // Refresh tiap 30 detik untuk cek status verifikasi Tendik
  });

  // Derived state dari SWR
  const proposalId = data?.proposalId || null;
  const isAccDosen = data?.isAccDosen || false;
  const isEligible = data?.isEligible || false;
  const seminarStatus = data?.seminarStatus || null;
  const bimbinganCount = data?.bimbinganCount || { p1: 0, p2: 0 };
  const documents = data?.documentsMap || {};
  const isSubmitted = seminarStatus && seminarStatus !== 'draft';

  // ================= HANDLERS =================
  const handleUpload = async (docId: string, file: File) => {
    if (!isEligible) { 
      alert("Akses terkunci. Syarat bimbingan/ACC belum terpenuhi."); 
      return; 
    }
    
    setIsSubmitting(true);
    try {
      const userId = data?.userId;
      if (!userId || !proposalId) return;
      
      const filePath = `${userId}/${docId}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('docseminar').upload(filePath, file, { upsert: true });
      if(uploadError) throw uploadError;
      
      const isDraftSkripsi = docId === 'draft_skripsi';
      const statusAwal = isDraftSkripsi ? 'Lengkap' : 'Menunggu Verifikasi';

      const { error: dbError } = await supabase.from('seminar_documents').upsert({ 
        proposal_id: proposalId, 
        nama_dokumen: docId, 
        file_url: filePath, 
        status: statusAwal 
      }, { onConflict: 'proposal_id,nama_dokumen' });

      if (dbError) throw dbError;

      if (!isDraftSkripsi) {
        const { data: tendik } = await supabase.from('profiles').select('id').eq('role', 'tendik').maybeSingle();
        if (tendik) {
          const docLabel = seminarDocs.find(d => d.id === docId)?.label || "Dokumen Seminar";
          await sendNotification(
            tendik.id,
            "Verifikasi Berkas Baru",
            `Mahasiswa telah mengunggah dokumen "${docLabel}". Mohon segera diverifikasi.`
          );
        }
      }

      mutate(); // Refresh UI instant
    } catch (error: any) { 
      alert("Gagal upload: " + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!window.confirm("Hapus file?")) return;
    setIsSubmitting(true);
    try {
      await supabase.storage.from('docseminar').remove([filePath]);
      await supabase.from('seminar_documents').delete().match({ proposal_id: proposalId, nama_dokumen: docId });
      mutate(); // Refresh UI instant
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleFinalSubmit = async () => {
    if (percentage < 100) return;

    const confirmKonsultasi = window.confirm("PERHATIAN!\n\nPastikan Anda sudah berkonsultasi dengan Dosen Pembimbing Utama & Co-Pembimbing terkait usulan tanggal dan jam seminar.\n\nLanjutkan pengajuan?");
    if (!confirmKonsultasi) return;

    const confirm2 = window.confirm("Yakin ingin mengirim pengajuan sekarang? Pastikan Draft Skripsi yang diunggah adalah versi final.");
    if (!confirm2) return;

    setIsSubmitting(true);
    try {
        const { error: reqError } = await supabase
            .from('seminar_requests')
            .upsert({ 
                proposal_id: proposalId,
                tipe: 'seminar',
                status: 'Menunggu Persetujuan', 
                created_at: new Date().toISOString()
            }, { onConflict: 'proposal_id,tipe' });

        if (reqError) throw reqError;

        const { data: kaprodi } = await supabase.from('profiles').select('id').eq('role', 'kaprodi').maybeSingle();
        if (kaprodi) {
          await sendNotification(
            kaprodi.id,
            "Pengajuan Jadwal Seminar",
            "Seorang mahasiswa telah melengkapi seluruh berkas seminar. Mohon segera tetapkan jadwal."
          );
        }

        alert("Berhasil! Pengajuan seminar Anda telah dikirim.");
        router.push('/mahasiswa/dashboard');
    } catch (err: any) {
        alert("Gagal mengirim: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const verifiedCount = seminarDocs.filter(d => documents[d.id]?.status === 'Lengkap').length;
  const percentage = Math.round((verifiedCount / totalDocs) * 100);

  return (
    <div className="p-10 max-w-[1400px] mx-auto outline-none focus:outline-none">
          
          {isLoading && !data ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 animate-pulse">
               <div className="lg:col-span-7 bg-slate-200 rounded-[2.5rem] h-[200px]"></div>
               <div className="lg:col-span-5 bg-slate-200 rounded-[2.5rem] h-[200px]"></div>
               <div className="lg:col-span-12 bg-slate-200 rounded-[3rem] h-[500px]"></div>
            </div>
          ) : error ? (
             <div className="p-10 text-center font-black text-red-500 uppercase tracking-widest">Gagal memuat data dokumen.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/60 flex items-center gap-10 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-blue-50/50 group-hover:scale-110 transition-transform duration-700">
                    <FileText size={180} />
                  </div>
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * percentage) / 100} className="text-blue-600 transition-all duration-1000" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-2xl font-black text-slate-800">{percentage}%</span>
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-xl font-black text-slate-800 mb-1">Kelengkapan Berkas</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{verifiedCount} dari {totalDocs} Dokumen Terverifikasi</p>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className={`h-full rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col justify-between ${isEligible ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100 border-emerald-400' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2">
                          {isEligible ? <ShieldCheck size={20} /> : <Lock size={18} />} AKSES SEMINAR
                        </h3>
                      </div>
                      <div className={`p-5 rounded-2xl font-bold tracking-tight text-xs leading-relaxed ${isEligible ? 'bg-emerald-600 text-emerald-50' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                        P1: {bimbinganCount.p1}/10 | P2: {bimbinganCount.p2}/10 <br />
                        ACC DOSEN: <span className={isAccDosen ? "text-emerald-400" : "text-red-400"}>{isAccDosen ? 'SUDAH' : 'BELUM'}</span>
                      </div>
                      {!isEligible && (
                        <p className="text-[9px] font-bold uppercase mt-3 tracking-widest opacity-60 italic">*Selesaikan 10x bimbingan & dapatkan ACC</p>
                      )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <h3 className="font-black uppercase tracking-tighter text-slate-800 text-sm">Unggah Berkas Persyaratan</h3>
                </div>
                
                <div className="p-8 space-y-4">
                  {seminarDocs.map(doc => (
                    <DocumentRow 
                      key={doc.id} 
                      {...doc} 
                      data={documents[doc.id]} 
                      onUpload={(f: File) => handleUpload(doc.id, f)} 
                      onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')} 
                      isEligible={isEligible} 
                      disabled={isSubmitting} // Disable tombol saat loading
                    />
                  ))}

                  <div className="mt-8 p-6 bg-blue-900 rounded-[2rem] text-white flex items-center gap-6 shadow-xl shadow-blue-100">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertCircle size={24} className="text-blue-200" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black tracking-tight">5. File Skripsi (Langkah Terakhir)</h4>
                      <p className="text-xs text-blue-100/70 font-medium leading-relaxed mt-1">
                        Wajib dikirim melalui e-mail ke <span className="text-white font-bold underline">informatika@unpad.ac.id</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                  {/* 🔥 TOMBOL SUBMIT DIREVISI 🔥 */}
                  <button
                    disabled={percentage < 100 || isSubmitting || isSubmitted}
                    onClick={handleFinalSubmit}
                    className={`px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 ${
                      isSubmitted
                        ? 'bg-green-100 text-green-700 border border-green-200 shadow-none cursor-not-allowed'
                        : percentage === 100 
                          ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting 
                      ? 'MEMPROSES...' 
                      : isSubmitted 
                        ? 'Pengajuan Seminar Telah Dikirim' 
                        : percentage === 100 
                          ? 'Kirim Pengajuan Seminar' 
                          : 'Dokumen Belum Lengkap'}
                    
                    {isSubmitted ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
    );
}

// ================= KOMPONEN ROW =================
function DocumentRow({ label, sub, data, onUpload, onDelete, isEligible, disabled }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const status = data?.status || 'Belum Diunggah';
  const isComplete = status === 'Lengkap';
  const isPending = status === 'Menunggu Verifikasi';
  const hasFile = !!data?.file_url;

  return (
    <div className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-300 ${isComplete ? 'bg-emerald-50/40 border-emerald-100' : hasFile ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
      <div className="flex items-center gap-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isComplete ? 'bg-white text-emerald-500' : isPending ? 'bg-white text-amber-500' : 'bg-slate-50 text-slate-300'}`}>
          {isComplete ? <Check size={28} strokeWidth={3} /> : isPending ? <Clock size={28} strokeWidth={3} /> : <CloudUpload size={28} />}
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1">{label}</p>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest">{sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {hasFile && (
          <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isComplete ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
            {status}
          </div>
        )}
        <div className="flex gap-2">
          {hasFile ? (
            <button disabled={disabled} onClick={onDelete} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"><X size={18} strokeWidth={3} /></button>
          ) : (
            <>
              <button 
                disabled={disabled || !isEligible}
                onClick={() => isEligible ? fileRef.current?.click() : null} 
                className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${isEligible ? 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                {!isEligible && <Lock size={12} className="mr-2 inline" />} UNGGAH PDF
              </button>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ""; }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}