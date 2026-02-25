"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/sidebar';
import { sendNotification } from "@/lib/notificationUtils";
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  Check, X, Clock, Layout, 
  AlertCircle, Lock, CloudUpload, ChevronRight,
  ShieldCheck, FileText, Sparkles
} from 'lucide-react';

interface DocumentData {
  id?: string;
  status: string;
  file_url?: string;
}

export default function UploadDokumenClient() {
  const router = useRouter();
  const [documents, setDocuments] = useState<{ [key: string]: DocumentData }>({});
  const [loading, setLoading] = useState(true);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isAccDosen, setIsAccDosen] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [bimbinganCount, setBimbinganCount] = useState({ p1: 0, p2: 0 });

  // ================= LIST DOKUMEN (Hanya 3 yang di-upload ke Web) =================
  // Poin 4 dikirim manual via email sesuai aturan
  const seminarDocs = [
    { id: 'form_layak_dan_jadwal', label: "Form Layak Seminar & Pengajuan Jadwal", sub: "Langkah 1: Upload PDF" },
    { id: 'nilai_magang_gabungan', label: "Form Nilai Magang (Dosen Wali & Lapangan)", sub: "Langkah 2: Upload PDF" },
    { id: 'bukti_serah_magang', label: "Bukti Penyerahan Laporan Magang", sub: "Langkah 3: Upload PDF" },
  ];

  const totalDocs = 3; // Syarat verifikasi web

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: proposal } = await supabase.from('proposals').select('id').eq('user_id', user.id).maybeSingle();
      if (!proposal) { setLoading(false); return; }
      setProposalId(proposal.id);

      // Logika Syarat Akses: 10x Bimbingan & ACC Dosen
      const { data: seminar } = await supabase.from('seminar_requests').select('approved_by_p1, approved_by_p2').eq('proposal_id', proposal.id).maybeSingle();
      const approvedByAll = seminar?.approved_by_p1 === true && seminar?.approved_by_p2 === true;
      setIsAccDosen(approvedByAll);

      const { data: supervisors } = await supabase.from('thesis_supervisors').select('dosen_id, role').eq('proposal_id', proposal.id);
      const { data: sessions } = await supabase.from('guidance_sessions').select(`dosen_id, session_feedbacks (status_revisi)`).eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir');

      let p1 = 0, p2 = 0;
      supervisors?.forEach(sp => {
        const validSessions = sessions?.filter((s: any) => s.dosen_id === sp.dosen_id && s.session_feedbacks?.[0]?.status_revisi !== 'revisi') || [];
        if (sp.role === 'utama' || sp.role === 'pembimbing1') p1 = validSessions.length;
        else p2 = validSessions.length;
      });

      setBimbinganCount({ p1, p2 });
      setIsEligible(p1 >= 10 && p2 >= 10 && approvedByAll);

      const { data: docs } = await supabase.from('seminar_documents').select('*').eq('proposal_id', proposal.id);
      if (docs) {
        const map: { [key: string]: DocumentData } = {};
        docs.forEach(d => map[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
        setDocuments(map);
      }
    } catch (err: any) { console.error(err.message); } finally { setLoading(false); }
  };

  const handleUpload = async (docId: string, file: File) => {
    if (!isEligible) { alert("⛔️ Akses terkunci. Syarat bimbingan/ACC belum terpenuhi."); return; }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const filePath = `${user.id}/${docId}_${Date.now()}.pdf`;
      await supabase.storage.from('docseminar').upload(filePath, file, { upsert: true });
      await supabase.from('seminar_documents').upsert({ proposal_id: proposalId, nama_dokumen: docId, file_url: filePath, status: 'Menunggu Verifikasi' }, { onConflict: 'proposal_id,nama_dokumen' });
      const { data: tendik } = await supabase.from('profiles').select('id').eq('role', 'tendik').maybeSingle();
      if (tendik) {
        const docLabel = seminarDocs.find(d => d.id === docId)?.label || "Dokumen Seminar";
        await sendNotification(
          tendik.id,
          "Verifikasi Berkas Baru",
          `Mahasiswa telah mengunggah dokumen "${docLabel}". Mohon segera diverifikasi.`
        );
      }
      await fetchInitialData();
    } catch (error: any) { alert("Gagal upload: " + error.message); } finally { setLoading(false); }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!window.confirm("Hapus file?")) return;
    try {
      setLoading(true);
      await supabase.storage.from('docseminar').remove([filePath]);
      await supabase.from('seminar_documents').delete().match({ proposal_id: proposalId, nama_dokumen: docId });
      await fetchInitialData();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // ================= FUNGSI KONFIRMASI KIRIM =================
  const handleFinalSubmit = async () => {
    if (percentage < 100) return;

    const confirm1 = window.confirm("Apakah Anda sudah mengirimkan File Skripsi ke email informatika@unpad.ac.id?");
    if (!confirm1) {
        alert("Silakan kirimkan email terlebih dahulu sebelum mengajukan seminar di sistem.");
        return;
    }

    const confirm2 = window.confirm("Yakin ingin mengirim pengajuan sekarang? Data yang sudah dikirim tidak dapat diubah kembali.");
    if (!confirm2) return;

    try {
        setLoading(true);
        const { error } = await supabase
            .from('seminar_requests')
            .upsert({ 
                proposal_id: proposalId,
                tipe: 'seminar',
                status: 'Menunggu Persetujuan', 
                created_at: new Date().toISOString()
            }, { onConflict: 'proposal_id,tipe' });

        if (error) throw error;

        const { data: kaprodi } = await supabase.from('profiles').select('id').eq('role', 'kaprodi').maybeSingle();
        if (kaprodi) {
          await sendNotification(
            kaprodi.id,
            "Pengajuan Jadwal Seminar",
            "Seorang mahasiswa telah melengkapi seluruh berkas seminar. Mohon segera tetapkan jadwal."
          );
        }

        alert("✅ Berhasil! Pengajuan seminar Anda telah dikirim.");
        router.push('/mahasiswa/dashboard');
    } catch (err: any) {
        alert("Gagal mengirim: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const verifiedCount = seminarDocs.filter(d => documents[d.id]?.status === 'Lengkap').length;
  const percentage = Math.round((verifiedCount / totalDocs) * 100);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-700 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER ASLI DIPERTAHANKAN */}
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

        <div className="p-10 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            {/* Progress Visual */}
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
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl w-fit">
                </div>
              </div>
            </div>

            {/* SYARAT AKSES SEMINAR CARD */}
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

          {/* DOCUMENT LIST */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="font-black uppercase tracking-tighter text-slate-800 text-sm">Unggah Berkas Persyaratan</h3>
            </div>
            
            <div className="p-8 space-y-4">
              {seminarDocs.map(doc => (
                <DocumentRow key={doc.id} {...doc} data={documents[doc.id]} onUpload={(f: File) => handleUpload(doc.id, f)} onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')} isEligible={isEligible} />
              ))}

              {/* SKRIPSI EMAIL INFO */}
              <div className="mt-8 p-6 bg-blue-900 rounded-[2rem] text-white flex items-center gap-6 shadow-xl shadow-blue-100">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle size={24} className="text-blue-200" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black uppercase tracking-tight">4. File Skripsi (Langkah Terakhir)</h4>
                  <p className="text-xs text-blue-100/70 font-medium leading-relaxed mt-1">
                    Wajib dikirim melalui e-mail ke <span className="text-white font-bold underline">informatika@unpad.ac.id</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-center">
              <button
                disabled={percentage < 100 || loading}
                onClick={handleFinalSubmit}
                className={`px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 ${percentage === 100 ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {loading ? 'MEMPROSES...' : percentage === 100 ? 'Kirim Pengajuan Seminar' : 'Dokumen Belum Lengkap'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentRow({ label, sub, data, onUpload, onDelete, isEligible }: any) {
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
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{label}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
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
            <button onClick={onDelete} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={18} strokeWidth={3} /></button>
          ) : (
            <>
              <button 
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