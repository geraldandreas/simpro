"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabaseClient';
import { 
  Bell, Search, Check, X, Clock, Layout, 
  AlertCircle, Lock, CloudUpload, FileText, ChevronRight 
} from 'lucide-react';

interface DocumentData {
  id?: string;
  status: string;
  file_url?: string;
}

export default function UnggahDokumenSeminar() {
  const [documents, setDocuments] = useState<{ [key: string]: DocumentData }>({});
  const [loading, setLoading] = useState(true);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isAccDosen, setIsAccDosen] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [bimbinganCount, setBimbinganCount] = useState({ p1: 0, p2: 0 });

  // ================= LIST DOKUMEN (Tetap Sama) =================
  const academicDocs = [
    { id: 'berita_acara_bimbingan', label: "Berita Acara Bimbingan", subLabel: "Download di SIAT" },
    { id: 'transkrip_nilai', label: "Transkrip Nilai", subLabel: "Disahkan dosen wali" },
    { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi" },
    { id: 'toefl', label: "Sertifikat TOEFL", subLabel: "Skor min 475" },
    { id: 'print_jurnal', label: "Print Out Jurnal Skripsi" },
    { id: 'sertifikat_publikasi', label: "Sertifikat Publikasi / Jurnal" },
  ];

  const adminDocs = [
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

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: proposal } = await supabase.from('proposals').select('id').eq('user_id', user.id).maybeSingle();
      if (!proposal) { setLoading(false); return; }
      setProposalId(proposal.id);

      const { data: supervisors } = await supabase.from('thesis_supervisors').select('dosen_id, role').eq('proposal_id', proposal.id);
      const { data: seminar } = await supabase.from('seminar_requests').select('approved_by_p1, approved_by_p2').eq('proposal_id', proposal.id).maybeSingle();
      const approvedByAll = seminar?.approved_by_p1 === true && seminar?.approved_by_p2 === true;
      setIsAccDosen(approvedByAll);

      const { data: sessions } = await supabase.from('guidance_sessions').select(`dosen_id, session_feedbacks (status_revisi)`).eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir');

      let p1Count = 0, p2Count = 0;
      supervisors?.forEach(sp => {
        const validSessions = sessions?.filter((s: any) => s.dosen_id === sp.dosen_id && s.session_feedbacks?.[0]?.status_revisi !== 'revisi') || [];
        if (sp.role === 'utama' || sp.role === 'pembimbing1') p1Count = validSessions.length;
        else p2Count = validSessions.length;
      });

      setBimbinganCount({ p1: p1Count, p2: p2Count });
      setIsEligible(p1Count >= 10 && p2Count >= 10 && approvedByAll);

      const { data: docs } = await supabase.from('seminar_documents').select('*').eq('proposal_id', proposal.id);
      if (docs) {
        const map: { [key: string]: DocumentData } = {};
        docs.forEach(d => map[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
        setDocuments(map);
      }
    } catch (err: any) { console.error(err.message); } finally { setLoading(false); }
  };

  const handleUpload = async (docId: string, file: File) => {
    if (!isEligible) { alert("⛔️ Akses terkunci. Syarat bimbingan belum terpenuhi."); return; }
    if (!proposalId) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan");
      const filePath = `${user.id}/${docId}_${Date.now()}.pdf`;
      const { error: storageError } = await supabase.storage.from('docseminar').upload(filePath, file, { upsert: true });
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('seminar_documents').upsert({ proposal_id: proposalId, nama_dokumen: docId, file_url: filePath, status: 'Menunggu Verifikasi' }, { onConflict: 'proposal_id,nama_dokumen' });
      if (dbError) throw dbError;
      await fetchInitialData();
    } catch (error: any) { alert("❌ Gagal upload: " + error.message); } finally { setLoading(false); }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!window.confirm("Hapus file ini?")) return;
    try {
      setLoading(true);
      await supabase.storage.from('docseminar').remove([filePath]);
      await supabase.from('seminar_documents').delete().match({ proposal_id: proposalId, nama_dokumen: docId });
      await fetchInitialData();
    } catch (error: any) { alert("❌ Gagal hapus"); } finally { setLoading(false); }
  };

  const totalDocs = 17;
  const verifiedAcademic = academicDocs.filter(d => documents[d.id]?.status === 'Lengkap').length;
  const verifiedAdmin = adminDocs.filter(d => documents[d.id]?.status === 'Lengkap').length;
  const totalVerified = verifiedAcademic + verifiedAdmin;
  const percentage = Math.round((totalVerified / totalDocs) * 100);

  const handleSubmitSeminar = async () => {
    if (percentage < 100) { alert("⚠️ Dokumen belum lengkap terverifikasi."); return; }
    // ... sisa logika submit tetap sama
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans text-slate-700 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-full">
        
        {/* Header Updated: Glassmorphism Effect */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Dokumen Seminar</h1>
          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors relative">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col p-10 overflow-hidden">
          
          {/* Dashboard Summary Card: Progres & Gatekeeping */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 shrink-0">
            {/* Persentase Kelengkapan */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white flex items-center gap-10">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="402" strokeDashoffset={402 - (402 * percentage) / 100} className="text-blue-600 transition-all duration-1000 ease-out" strokeLinecap="round" />
                </svg>
                <span className="absolute text-3xl font-black text-slate-800">{percentage}%</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-800 mb-2">Validasi Kelengkapan</h2>
                <p className="text-slate-400 font-medium mb-6 uppercase tracking-widest text-xs">
                  {totalVerified} dari {totalDocs} Dokumen Tervalidasi Tendik
                </p>
                <div className="flex gap-4">
                  <div className="px-5 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Akademik: {verifiedAcademic}/6</span>
                  </div>
                  <div className="px-5 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Administrasi: {verifiedAdmin}/11</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Gatekeeping Card */}
            <div className={`rounded-[2.5rem] p-8 flex flex-col justify-center border transition-all duration-500 ${isEligible ? 'bg-emerald-500 text-white shadow-emerald-200 border-emerald-400' : 'bg-white text-slate-400 shadow-xl border-white'}`}>
              <div className="flex items-center gap-4 mb-4">
                {isEligible ? <Check className="bg-white text-emerald-500 rounded-xl p-1" size={32} /> : <Lock className="text-slate-300" size={32} />}
                <h3 className="font-black uppercase tracking-tighter text-lg">Akses Seminar</h3>
              </div>
              <p className={`text-xs font-medium mb-4 leading-relaxed ${isEligible ? 'text-emerald-50' : 'text-slate-400'}`}>
                {isEligible ? 'Persyaratan bimbingan terpenuhi. Silakan unggah seluruh dokumen.' : 'Selesaikan minimal 10x bimbingan dengan P1 & P2.'}
              </p>
              <div className={`p-4 rounded-2xl text-[10px] font-black tracking-widest ${isEligible ? 'bg-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                P1: {bimbinganCount.p1}/10 | P2: {bimbinganCount.p2}/10 | ACC: {isAccDosen ? 'YA' : 'TDK'}
              </div>
            </div>
          </div>

          {/* Document Sections */}
          <div className="flex-1 bg-white rounded-[3rem] border border-white shadow-2xl shadow-slate-200/60 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 p-10 space-y-12 custom-scrollbar">
              
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl shadow-sm"><Layout size={24} /></div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Berkas Akademik</h2>
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 px-4 py-1.5 rounded-full text-slate-400 uppercase tracking-widest">{verifiedAcademic} / 6 VALID</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {academicDocs.map(doc => (
                    <DocumentRow key={doc.id} {...doc} data={documents[doc.id]} onUpload={(f: File) => handleUpload(doc.id, f)} onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')} isEligible={isEligible} />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-8 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl shadow-sm"><FileText size={24} /></div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Berkas Administrasi</h2>
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 px-4 py-1.5 rounded-full text-slate-400 uppercase tracking-widest">{verifiedAdmin} / 11 VALID</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {adminDocs.map(doc => (
                    <DocumentRow key={doc.id} {...doc} data={documents[doc.id]} onUpload={(f: File) => handleUpload(doc.id, f)} onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')} isEligible={isEligible} />
                  ))}
                </div>
              </section>

              <div className="pt-10 flex justify-center">
                <button
                  onClick={handleSubmitSeminar}
                  disabled={percentage < 100}
                  className={`px-16 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center gap-3 ${percentage === 100 ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {percentage === 100 ? 'Ajukan Seminar Sekarang' : 'Lengkapi Berkas Untuk Mengajukan'}
                  <ChevronRight size={18} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ================= ROW COMPONENT (Refined UI) =================
function DocumentRow({ label, subLabel, data, onUpload, onDelete, isEligible }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const status = data?.status || 'Belum Lengkap';
  const isComplete = status === 'Lengkap';
  const isPending = status === 'Menunggu Verifikasi';
  const hasFile = !!data?.file_url;

  return (
    <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 ${isComplete ? 'bg-emerald-50 border-emerald-100' : hasFile ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-6 flex-1">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isComplete ? 'bg-white text-emerald-500' : isPending ? 'bg-white text-amber-500' : 'bg-slate-50 text-slate-300'}`}>
          {isComplete ? <Check size={28} strokeWidth={3} /> : isPending ? <Clock size={28} strokeWidth={3} /> : <CloudUpload size={28} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{label}</p>
          {subLabel && <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{subLabel}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasFile && (
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isComplete ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
            {status}
          </div>
        )}
        
        <div className="flex gap-2">
          {hasFile ? (
            <button onClick={onDelete} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><X size={18} strokeWidth={3} /></button>
          ) : (
            <>
              <button 
                onClick={() => isEligible ? fileRef.current?.click() : alert("⛔️ Selesaikan bimbingan!")} 
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${isEligible ? 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                {!isEligible && <Lock size={12} />} Unggah PDF
              </button>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ""; }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}