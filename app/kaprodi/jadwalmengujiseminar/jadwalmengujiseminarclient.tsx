"use client";

import React, { useEffect, useState, Suspense } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Download, Upload, Save, 
  CheckCircle2, FileText, MessageSquare, AlertCircle, ShieldCheck, Lock,
  Calculator, Loader2, User
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function JadwalMengujiSeminarKaprodiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DetailContent />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchDetailUjianSeminar = async (id: string | null) => {
  if (!id) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Fetch Seminar Request & Proposal
  const { data: req, error } = await supabase.from('seminar_requests').select(`
      id, status, proposal:proposals (id, judul, bidang, user:profiles ( nama, npm, avatar_url ), docs:seminar_documents ( nama_dokumen, file_url ))
    `).eq('id', id).single();

  if (error) throw error;

  const rawProposal = (req as any).proposal;
  const propData = Array.isArray(rawProposal) ? rawProposal[0] : rawProposal;
  
  // 2. Fetch Signed URL untuk Draft Skripsi
  let draftUrl = null;
  const docs = propData?.docs;
  const docsArr = Array.isArray(docs) ? docs : docs ? [docs] : [];
  const draftDoc = docsArr.find((d: any) => d?.nama_dokumen === 'draft_skripsi');
  
  if (draftDoc?.file_url) {
    const { data: signedData } = await supabase.storage.from('docseminar').createSignedUrl(draftDoc.file_url, 3600);
    draftUrl = signedData?.signedUrl || null;
  }

  let pembimbing1 = "..................................................................";
  let pembimbing2 = "..................................................................";
  let penguji1 = "..................................................................";
  let penguji2 = "..................................................................";
  let penguji3 = "..................................................................";
  let tanggalSeminar = "..................................................................";
  let detectedRole = "";
  let dosenTtdUrl = null;
  let existingFeedback = null;

  if (propData?.id) {
    const [ { data: sups }, { data: exms }, { data: sched }, { data: dosenProfile }, { data: feedback } ] = await Promise.all([
      supabase.from('thesis_supervisors').select('role, dosen_id, dosen:profiles(nama)').eq('proposal_id', propData.id),
      supabase.from('examiners').select('role, dosen_id, dosen:profiles(nama)').eq('seminar_request_id', id),
      supabase.from('seminar_schedules').select('tanggal').eq('seminar_request_id', id).maybeSingle(),
      supabase.from('profiles').select('ttd_url').eq('id', user.id).single(),
      supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', id).eq('dosen_id', user.id).maybeSingle()
    ]);

    if (sups) {
      const p1 = sups.find((s:any) => s.role?.toLowerCase().includes('utama') || s.role?.toLowerCase().includes('pembimbing1'));
      const p2 = sups.find((s:any) => s.role?.toLowerCase().includes('pendamping') || s.role?.toLowerCase().includes('pembimbing2'));
      pembimbing1 = (Array.isArray(p1?.dosen) ? p1?.dosen[0]?.nama : (p1?.dosen as any)?.nama) || pembimbing1;
      pembimbing2 = (Array.isArray(p2?.dosen) ? p2?.dosen[0]?.nama : (p2?.dosen as any)?.nama) || pembimbing2;
      
      const mySup = sups.find((s:any) => s.dosen_id === user.id);
      if (mySup) {
        const r = mySup.role?.toLowerCase() || '';
        if (r.includes('utama') || r.includes('pembimbing1')) detectedRole = 'pembimbing1';
        else if (r.includes('pendamping') || r.includes('pembimbing2')) detectedRole = 'pembimbing2';
        else detectedRole = mySup.role;
      }
    }
    
    if (exms) {
      const e1 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji1'));
      const e2 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji2'));
      const e3 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji3'));
      penguji1 = (Array.isArray(e1?.dosen) ? e1?.dosen[0]?.nama : (e1?.dosen as any)?.nama) || penguji1;
      penguji2 = (Array.isArray(e2?.dosen) ? e2?.dosen[0]?.nama : (e2?.dosen as any)?.nama) || penguji2;
      penguji3 = (Array.isArray(e3?.dosen) ? e3?.dosen[0]?.nama : (e3?.dosen as any)?.nama) || penguji3;

      if (!detectedRole) {
        const myExm = exms.find((e:any) => e.dosen_id === user.id);
        if (myExm) {
          const r = myExm.role?.toLowerCase() || '';
          if (r.includes('penguji1')) detectedRole = 'penguji1';
          else if (r.includes('penguji2')) detectedRole = 'penguji2';
          else if (r.includes('penguji3')) detectedRole = 'penguji3';
          else detectedRole = myExm.role;
        }
      }
    }

    if (sched?.tanggal) tanggalSeminar = sched.tanggal;
    if (dosenProfile) dosenTtdUrl = dosenProfile.ttd_url;
    existingFeedback = feedback;
  }

  return {
    data: { ...req, proposal: propData },
    draftUrl,
    pembimbing1,
    pembimbing2,
    penguji1,
    penguji2,
    penguji3,
    tanggalSeminar,
    myRole: detectedRole,
    dosenTtdUrl,
    existingFeedback
  };
};

function DetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); 
  const router = useRouter();
  
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    id ? `jadwal_menguji_seminar_${id}` : null,
    () => fetchDetailUjianSeminar(id),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const data = cache?.data || null;
  const draftUrl = cache?.draftUrl || null;
  const pembimbing1 = cache?.pembimbing1 || "..................................................................";
  const pembimbing2 = cache?.pembimbing2 || "..................................................................";
  const penguji1 = cache?.penguji1 || "..................................................................";
  const penguji2 = cache?.penguji2 || "..................................................................";
  const penguji3 = cache?.penguji3 || "..................................................................";
  const dosenTtdUrl = cache?.dosenTtdUrl || null;
  const isPenguji = (cache?.myRole || "").toLowerCase().includes('penguji');

  // --- LOCAL FORM STATE ---
  const [submitting, setSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); 

  const [n1, setN1] = useState(""); 
  const [n2, setN2] = useState(""); 
  const [n3, setN3] = useState(""); 
  const [n4, setN4] = useState(""); 
  const [n5, setN5] = useState(""); 
  const [nilai, setNilai] = useState("");

  const [komentar, setKomentar] = useState("");
  const [fileRevisi, setFileRevisi] = useState<File | null>(null);
  const [statusRevisi, setStatusRevisi] = useState("revisi");
  
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Sync state lokal ketika data SWR berhasil dimuat & ada history feedback
  useEffect(() => {
    if (cache?.existingFeedback) {
      const fb = cache.existingFeedback;
      setNilai(fb.nilai_angka?.toString() || "");
      
      if (fb.detail_nilai) {
        const detail = fb.detail_nilai;
        setN1(detail.n1 || "");
        setN2(detail.n2 || "");
        setN3(detail.n3 || "");
        setN4(detail.n4 || "");
        setN5(detail.n5 || "");
      }

      setKomentar(fb.catatan_revisi || "");
      setStatusRevisi(fb.status_revisi || "revisi");
      setExistingFileUrl(fb.file_revisi_url || null);
      setIsLocked(true);
    }
  }, [cache?.existingFeedback]);

  // Kalkulasi Otomatis Rata-rata
  useEffect(() => {
    if (!isLocked) {
      const v1 = parseFloat(n1) || 0;
      const v2 = parseFloat(n2) || 0;
      const v3 = parseFloat(n3) || 0;
      const v4 = parseFloat(n4) || 0;
      const v5 = parseFloat(n5) || 0;

      let countFilled = 0;
      if (n1 !== "") countFilled++;
      if (n2 !== "") countFilled++;
      if (n3 !== "") countFilled++;
      if (n4 !== "") countFilled++;
      if (n5 !== "") countFilled++;

      if (countFilled > 0) {
        const calc = (v1 + v2 + v3 + v4 + v5) / countFilled;
        setNilai(calc.toFixed(2));
      } else {
        setNilai("");
      }
    }
  }, [n1, n2, n3, n4, n5, isLocked]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isLocked) return; 

    if (statusRevisi === "diterima" && !dosenTtdUrl) {
      alert("⚠️ PERHATIAN!\n\nAnda belum mengunggah Tanda Tangan Digital.\nSilakan masuk ke menu 'Settings' untuk mengunggah TTD Anda sebelum memberikan ACC Lanjut Sidang.");
      return; 
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda belum login.");

      let fileUrl = existingFileUrl;

      if (fileRevisi) {
        const fileExt = fileRevisi.name.split('.').pop();
        const safeName = fileRevisi.name.replace(/[^a-zA-Z0-9]/g, "_"); 
        const fileName = `revisi_${id}_${user.id}_${Date.now()}_${safeName}.${fileExt}`; 
        
        const { error: uploadError } = await supabase.storage
          .from('feedback_seminar')
          .upload(fileName, fileRevisi, { upsert: true });

        if (uploadError) throw uploadError;
        fileUrl = fileName;
      }

      const detailNilaiJson = {
        n1: parseFloat(n1) || 0,
        n2: parseFloat(n2) || 0,
        n3: parseFloat(n3) || 0,
        n4: parseFloat(n4) || 0,
        n5: parseFloat(n5) || 0
      };

      const { error: upsertError } = await supabase.from('seminar_feedbacks').upsert({
          seminar_request_id: id,
          dosen_id: user.id,
          nilai_angka: parseFloat(nilai),
          detail_nilai: detailNilaiJson, 
          catatan_revisi: komentar,
          file_revisi_url: fileUrl, 
          status_revisi: statusRevisi 
        }, { onConflict: 'seminar_request_id,dosen_id' }); 

      if (upsertError) throw upsertError;

      alert("Penilaian berhasil disimpan!");
      
      mutate(); // Refresh SWR state
      setIsRedirecting(true); 
      router.push('/kaprodi/jadwalpengujiseminar'); 
      
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
      setSubmitting(false); 
    } 
  };


  if (isRedirecting) return (
    <div className="min-h-screen flex items-center justify-center p-20 font-black text-slate-400 tracking-widest uppercase bg-[#F8F9FB]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        MENGARAHKAN KEMBALI...
      </div>
    </div>
  );

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center p-20 font-black text-red-400 tracking-widest uppercase bg-[#F8F9FB]">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        PARAMETER ID TIDAK DITEMUKAN
      </div>
    </div>
  );

  if (isLoading && !cache) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-10 font-sans text-slate-700">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
              KEMBALI KE JADWAL
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 mb-5 overflow-hidden border-4 border-slate-50 relative shrink-0 flex items-center justify-center font-black text-slate-300 text-3xl uppercase">
                {data?.proposal?.user?.avatar_url ? <img src={data.proposal.user.avatar_url} className="object-cover w-full h-full" alt="Profil" /> : data?.proposal?.user?.nama?.charAt(0) || "?"}
              </div>
              
              <h2 className="text-lg font-black text-slate-800 capitalize tracking-tight leading-tight mb-2">
                {data?.proposal?.user?.nama?.toLowerCase() || "Mahasiswa"}
              </h2>
              <p className="text-xs font-bold text-slate-400 tracking-widest mb-8">{data?.proposal?.user?.npm || "-"}</p>
              
              <div className="w-full h-[1px] bg-slate-100 mb-6"></div>
              
              <div className="w-full text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Dokumen Skripsi Mahasiswa</p>
                {draftUrl ? (
                  <a href={draftUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg group">
                    <Download size={16} className="group-hover:-translate-y-1 transition-transform" /> Unduh Draft
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400"><AlertCircle size={24} className="mb-2 opacity-50" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">Belum Diunggah</p></div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white h-full flex flex-col justify-between relative">
              
              {isLocked && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500 shrink-0 mt-0.5">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em] mb-1.5">Data Telah Disimpan & Terkunci</p>
                    <p className="text-xs text-blue-600 font-medium leading-relaxed">
                      Penilaian awal telah dikunci. Untuk melanjutkan proses tanya jawab revisi atau mengubah status ACC, silakan gunakan menu <b>Perbaikan Seminar Mahasiswa</b> di Sidebar Anda.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Lembar Penilaian</h3>
                  <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <p className="text-slate-600 text-sm font-bold leading-relaxed">"{data?.proposal?.judul || "Judul belum tersedia"}"</p>
                  </div>
                </div>

                <div className="mb-8 p-8 border-2 border-slate-100 rounded-[2rem] bg-slate-50/50">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                    <Calculator size={14} className="text-blue-500" /> 
                    {isPenguji ? "Rincian Nilai Ujian Skripsi" : "Rincian Nilai Pelaksanaan Seminar"} (Skala 0-100)
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">1. Sistematika Penulisan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n1} onChange={(e) => setN1(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">2. Isi Skripsi</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n2} onChange={(e) => setN2(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">3. Analisis & Pembahasan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n3} onChange={(e) => setN3(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">4. Penguasaan Pengetahuan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n4} onChange={(e) => setN4(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">5. Cara Menanggapi & Memecahkan Masalah</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n5} onChange={(e) => setN5(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rata-Rata Otomatis</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">{nilai ? nilai : "0.00"}</p>
                    </div>
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black tracking-widest uppercase">
                      NILAI RATA-RATA
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3"><Upload size={14} className="text-blue-500" /> Upload Draft Feedback (PDF)</label>
                  
                  {isLocked ? (
                    <div className="p-4 border-2 border-slate-200 bg-slate-50 rounded-[1.5rem] flex flex-col items-center justify-center h-[72px] cursor-not-allowed opacity-80">
                      <p className="text-[10px] font-black uppercase tracking-widest truncate w-full text-center px-4 text-slate-400">
                        {existingFileUrl ? "File Lampiran Tersimpan" : "Tidak Ada Lampiran"}
                      </p>
                    </div>
                  ) : (
                    <div className="relative group">
                      <input type="file" accept=".pdf" onChange={(e) => setFileRevisi(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`p-4 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center transition-all h-[72px] ${fileRevisi ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 group-hover:border-blue-300 group-hover:bg-blue-50/30'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest truncate w-full text-center px-4 ${fileRevisi ? 'text-blue-600' : 'text-slate-400'}`}>{fileRevisi ? fileRevisi.name : "Klik / Drop PDF Di Sini"}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3"><ShieldCheck size={14} className="text-blue-500" /> Keputusan Revisi</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => setStatusRevisi("revisi")} 
                      className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${
                        statusRevisi === "revisi" 
                          ? `border-red-400 bg-red-50 text-red-600 ${isLocked ? 'opacity-80' : ''}` 
                          : `border-slate-100 bg-slate-50 text-slate-400 ${isLocked ? '' : 'hover:border-red-200'}`
                      }`}
                    >
                      <AlertCircle size={18} /> Ada Revisi
                    </button>
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => setStatusRevisi("diterima")} 
                      className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${
                        statusRevisi === "diterima" 
                          ? `border-emerald-400 bg-emerald-50 text-emerald-600 ${isLocked ? 'opacity-80' : ''}` 
                          : `border-slate-100 bg-slate-50 text-slate-400 ${isLocked ? '' : 'hover:border-emerald-200'}`
                      }`}
                    >
                      <ShieldCheck size={18} /> ACC Lanjut Sidang
                    </button>
                  </div>
                </div>

                <div className="mb-10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare size={14} className="text-blue-500" /> Catatan & Komentar</label>
                  </div>
                  <textarea 
                    rows={5} required value={komentar} onChange={(e) => setKomentar(e.target.value)} 
                    placeholder="Tuliskan poin-poin yang harus direvisi..." 
                    disabled={isLocked}
                    className={`w-full p-6 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all placeholder:text-slate-300 ${isLocked ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-80' : 'bg-slate-50 text-slate-600 shadow-inner'}`} 
                  />
                </div>
              </div>

              {!isLocked && (
                <div>
                  <button type="submit" disabled={submitting || isRedirecting} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-900 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 active:scale-[0.98]">
                    {submitting || isRedirecting ? "MEMPROSES..." : <><Save size={18} /> Simpan Penilaian</>}
                  </button>
                </div>
              )}

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}