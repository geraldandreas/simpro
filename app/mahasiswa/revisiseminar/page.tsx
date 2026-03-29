"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr'; 
import Sidebar from '@/components/sidebar'; 
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, CheckCircle2, Save, User, 
  FileText, Download, AlertCircle, Clock, Upload, Lock, Trash2, Check
} from 'lucide-react';

// Helper untuk parse JSON dengan aman
const parseSafe = (data: any) => {
  try { return typeof data === 'string' ? JSON.parse(data) : data; } 
  catch (e) { return null; }
};

export default function DetailRevisiMahasiswaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-[#F4F7FE] overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col items-center justify-center h-screen relative z-10">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
        </main>
      </div>
    }>
      <DetailRevisiMahasiswa />
    </Suspense>
  );
}

// ================= FETCHER DATA SWR =================
const fetchRuangRevisi = async (dosen_id: string | null) => {
  if (!dosen_id) throw new Error("ID Dosen kosong");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // 🔥 PERBAIKAN DI SINI: Tambahkan ttd_url pada select profiles 🔥
  const { data: dosen } = await supabase.from('profiles').select('nama, avatar_url, ttd_url').eq('id', dosen_id).single();
  const { data: proposal } = await supabase.from('proposals').select('id, judul, user:profiles(nama, npm)').eq('user_id', session.user.id).single();
  
  const { data: request } = await supabase.from('seminar_requests')
    .select('id').eq('proposal_id', proposal.id).eq('tipe', 'seminar').in('status', ['Selesai', 'Revisi', 'Disetujui'])
    .order('created_at', { ascending: false }).limit(1).single();

  const [ { data: fbData }, { data: sups }, { data: exms }, { data: sched } ] = await Promise.all([
    supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', request.id).eq('dosen_id', dosen_id).maybeSingle(),
    supabase.from('thesis_supervisors').select('dosen_id, role, dosen:profiles(nama)').eq('proposal_id', proposal.id),
    supabase.from('examiners').select('role, dosen_id, dosen:profiles(nama)').eq('seminar_request_id', request.id),
    supabase.from('seminar_schedules').select('tanggal').eq('seminar_request_id', request.id).maybeSingle()
  ]);
  
  let signedMhsFile = null;
  if (fbData?.file_jawaban_url) {
    const { data: mhsFile } = await supabase.storage.from('seminar_perbaikan').createSignedUrl(fbData.file_jawaban_url, 3600);
    signedMhsFile = mhsFile?.signedUrl || null;
  }

  let exportData = {
    namaMhs: Array.isArray(proposal.user) ? proposal.user[0]?.nama : (proposal.user as any)?.nama,
    npmMhs: Array.isArray(proposal.user) ? proposal.user[0]?.npm : (proposal.user as any)?.npm,
    judul: proposal.judul,
    tanggal: sched?.tanggal || "..................................................................",
    pembimbing1: "..................................................................",
    pembimbing2: "..................................................................",
    penguji1: "..................................................................",
    penguji2: "..................................................................",
    penguji3: "..................................................................",
    roleDosenIni: ""
  };

  let detectedRole = "";
  if (sups) {
    exportData.pembimbing1 = sups.find((s:any) => s.role === 'utama' || s.role === 'pembimbing1')?.dosen?.nama || exportData.pembimbing1;
    exportData.pembimbing2 = sups.find((s:any) => s.role === 'pendamping' || s.role === 'pembimbing2')?.dosen?.nama || exportData.pembimbing2;
    const mySup = sups.find((s:any) => s.dosen_id === dosen_id);
    if (mySup) detectedRole = (mySup.role === 'utama') ? 'pembimbing1' : (mySup.role === 'pendamping') ? 'pembimbing2' : mySup.role;
  }
  if (exms) {
    exportData.penguji1 = exms.find((e:any) => e.role === 'penguji1')?.dosen?.nama || exportData.penguji1;
    exportData.penguji2 = exms.find((e:any) => e.role === 'penguji2')?.dosen?.nama || exportData.penguji2;
    exportData.penguji3 = exms.find((e:any) => e.role === 'penguji3')?.dosen?.nama || exportData.penguji3;
    if (!detectedRole) {
      const myExm = exms.find((e:any) => e.dosen_id === dosen_id);
      if (myExm) detectedRole = myExm.role;
    }
  }
  exportData.roleDosenIni = detectedRole; 

  // 🔥 PERBAIKAN DI SINI: Menyisipkan dosenTtdUrl ke dalam return 🔥
  return { dosenInfo: dosen, dosenTtdUrl: dosen?.ttd_url || null, feedback: fbData ? { ...fbData, signedMhsFile } : null, exportData, requestId: request.id };
};

function DetailRevisiMahasiswa() {
  const searchParams = useSearchParams();
  const dosen_id = searchParams.get('dosen_id'); 
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    isMounted && dosen_id ? `revisi_mhs_v5_${dosen_id}` : null, 
    () => fetchRuangRevisi(dosen_id)
  );

  const [sending, setSending] = useState(false);
  const [fileUploadForm, setFileUploadForm] = useState<File | null>(null);
  const [pointAnswers, setPointAnswers] = useState<any[]>([]);

  useEffect(() => { setIsMounted(true); }, []);

  const dosenInfo = data?.dosenInfo;
  const feedback = data?.feedback;
  const expData = data?.exportData;
  const dosenTtdUrl = data?.dosenTtdUrl; // Mengambil TTD Dosen dari SWR
  const isAcc = feedback?.status_revisi === 'diterima';

  // Sinkronisasi data JSON ke format Checklist
  useEffect(() => {
    if (feedback) {
      const parsedCatatan = parseSafe(feedback.catatan_revisi);
      const parsedJawaban = parseSafe(feedback.jawaban_revisi);

      if (Array.isArray(parsedCatatan)) {
        setPointAnswers(parsedCatatan.map((cp, idx) => ({
          ...cp,
          jawaban_mhs: Array.isArray(parsedJawaban) ? (parsedJawaban[idx]?.answerText || "") : ""
        })));
      } else if (feedback.catatan_revisi) {
        // Fallback jika datanya masih teks lama
        const lines = feedback.catatan_revisi.split('\n').filter((l:string)=>l.trim()!=='');
        setPointAnswers(lines.map((text:string, idx:number) => {
          let ansText = "";
          if (Array.isArray(parsedJawaban)) ansText = parsedJawaban[idx]?.answerText || "";
          else if (idx === 0 && typeof feedback.jawaban_revisi === 'string' && !feedback.jawaban_revisi.includes('[{')) ansText = feedback.jawaban_revisi;
          
          return { text: text, status: 'pending', dosen_feedback: '', jawaban_mhs: ansText };
        }));
      }
    }
  }, [feedback]);

  // Update jawaban per poin
  const handleUpdatePointAnswer = (idx: number, text: string) => {
    const updated = [...pointAnswers];
    updated[idx].jawaban_mhs = text;
    setPointAnswers(updated);
  };

  // ================= FUNGSI EXPORT WORD MATRIKS (TERJEMAHAN JSON) =================
  const handleExportWord = () => {
    if (!expData) return;
    const formattedDate = expData.tanggal.includes("-") ? new Date(expData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : expData.tanggal;

    const generateRow = (no: number, labelTitle: string, namaDosen: string, roleKey: string) => {
      const isThisDosen = expData.roleDosenIni === roleKey;
      let uraianHtml = "<br><br><br>";
      let jawabanHtml = "<br><br><br>";

      if (isThisDosen && pointAnswers.length > 0) {
         uraianHtml = pointAnswers.map((p, i) => `${String.fromCharCode(65 + i)}. ${p.text || p.pointText || ''}`).join('<br><br>');
         jawabanHtml = pointAnswers.map((p, i) => `${String.fromCharCode(65 + i)}. ${p.jawaban_mhs || 'Belum ada jawaban'}`).join('<br><br>');
      }
      
      // LOGIC MENCETAK TANDA TANGAN JIKA SUDAH ACC
      const ttdHtml = (isThisDosen && dosenTtdUrl && isAcc) 
        ? `<div style="text-align: center;"><img src="${dosenTtdUrl}" width="98" height="95" style="width: 2.6cm; height: 2.51cm;" alt="TTD" /></div>` 
        : "";

      return `<tr>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: center;">${no}.</td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top;">${labelTitle}<br/><strong>${namaDosen !== ".................................................................." ? namaDosen : ""}</strong><br/><br/>${uraianHtml}</td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top;"><br/><br/>${jawabanHtml}</td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: middle;">${ttdHtml}</td>
      </tr>`;
    };

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Matriks Perbaikan</title></head><body><div style="text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; line-height: 1.5; font-size: 14pt;">MATRIKS PERBAIKAN SKRIPSI<br>PROGRAM STUDI TEKNIK INFORMATIKA<br>FAKULTAS MATEMATIKA DAN ILMU PENGETAHUAN ALAM<br>UNIVERSITAS PADJADJARAN</div><br><br><table style="font-family: 'Times New Roman', Times, serif; border: none; width: 100%; font-size: 12pt;"><tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>${expData.namaMhs || '..................................................................'}</td></tr><tr><td>NPM</td><td>:</td><td>${expData.npmMhs || '..................................................................'}</td></tr><tr><td>Tanggal Sidang</td><td>:</td><td>${formattedDate}</td></tr><tr><td>Judul Skripsi</td><td>:</td><td>${expData.judul || '..................................................................'}</td></tr><tr><td>Pembimbing 1</td><td>:</td><td>${expData.pembimbing1}</td></tr><tr><td>Pembimbing 2</td><td>:</td><td>${expData.pembimbing2}</td></tr><tr><td>Penguji 1</td><td>:</td><td>${expData.penguji1}</td></tr><tr><td>Penguji 2</td><td>:</td><td>${expData.penguji2}</td></tr><tr><td>Penguji 3</td><td>:</td><td>${expData.penguji3}</td></tr></table><br><br><table style="font-family: 'Times New Roman', Times, serif; border-collapse: collapse; width: 100%; border: 1px solid black; font-size: 12pt;"><thead><tr><th style="border: 1px solid black; padding: 8px; width: 5%;">No</th><th style="border: 1px solid black; padding: 8px; width: 45%;">Uraian masukan pembimbing dan penguji (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 40%;">Uraian Perbaikan yang sudah dilakukan (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 10%;">TTD</th></tr></thead><tbody>${generateRow(1, 'Pembimbing 1', expData.pembimbing1, 'pembimbing1')}${generateRow(2, 'Pembimbing 2', expData.pembimbing2, 'pembimbing2')}${generateRow(3, 'Penguji 1', expData.penguji1, 'penguji1')}${generateRow(4, 'Penguji 2', expData.penguji2, 'penguji2')}${generateRow(5, 'Penguji 3', expData.penguji3, 'penguji3')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const mhsName = expData.namaMhs ? expData.namaMhs.replace(/\s+/g, '_') : 'Mahasiswa';
    link.download = `Matriks_Perbaikan_${mhsName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔥 FUNGSI MENYIMPAN URAIAN & FILE REVISI (OVERWRITE ITERATIVE) 🔥
  const handleSaveMatriks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback) return;
    
    // Cek apakah ada file yang diupload JIKA status revisinya masih baru
    if (!fileUploadForm && !feedback?.file_jawaban_url) {
      alert("Harap unggah draft skripsi (PDF) terbaru Anda.");
      return;
    }

    try {
      setSending(true);
      let fileUrl = feedback.file_jawaban_url; 

      if (fileUploadForm) {
        const fileExt = fileUploadForm.name.split('.').pop();
        const safeName = fileUploadForm.name.replace(/[^a-zA-Z0-9]/g, "_");
        const filePath = `${feedback.seminar_request_id}/${Date.now()}_jawaban_${safeName}.${fileExt}`;
        
        const { error: uploadErr } = await supabase.storage.from('seminar_perbaikan').upload(filePath, fileUploadForm, { upsert: true });
        if (uploadErr) throw uploadErr;
        fileUrl = filePath;
      }

      // Update jawaban_revisi ke format JSON yang benar agar Dosen bisa baca
      await supabase.from('seminar_feedbacks').update({
        jawaban_revisi: JSON.stringify(pointAnswers.map(pa => ({ answerText: pa.jawaban_mhs }))),
        file_jawaban_url: fileUrl,
        status_revisi: 'diperiksa' 
      }).eq('id', feedback.id);

      alert("✅ Progres perbaikan berhasil dikirim ke Dosen!");
      setFileUploadForm(null);
      mutate(); 

    } catch (err: any) {
      alert("Gagal mengirim perbaikan: " + err.message);
    } finally {
      setSending(false);
    }
  };

  if (!isMounted) return null; 
  if (!dosen_id) return <div className="flex h-screen bg-[#F4F7FE]"><Sidebar /><main className="flex-1 ml-64 flex items-center justify-center font-black text-red-500 uppercase tracking-widest">ID Dosen Tidak Ditemukan</main></div>;
  if (isLoading && !data) return <div className="flex h-screen bg-[#F4F7FE]"><Sidebar /><main className="flex-1 ml-64 flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div></main></div>;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-full overflow-hidden bg-[#F8F9FB] relative z-10">
        
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
          <button onClick={() => router.push('/mahasiswa/perbaikan')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest">
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className="flex items-center gap-4">
             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isAcc ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {isAcc ? 'Selesai / ACC' : 'Proses Revisi'}
             </span>
             <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center shrink-0 shadow-inner">
                  {dosenInfo?.avatar_url ? <img src={dosenInfo.avatar_url} className="w-full h-full object-cover rounded-3xl" alt="Dosen"/> : <User size={32} className="text-slate-300"/>}
               </div>
               <div className="flex-1">
                  <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{dosenInfo?.nama}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Dosen Penguji / Pembimbing</p>
               </div>
               
               <div className="shrink-0 flex gap-4">
                  <button onClick={handleExportWord} className="px-5 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 text-xs font-bold">
                    <Download size={16} /> Unduh Format Matriks (.doc)
                  </button>
               </div>
            </div>

            {/* List Poin Perbaikan (Checklist JSON) */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     Daftar Poin Perbaikan ({pointAnswers.length})
                  </h3>
               </div>

               {pointAnswers.map((item, idx) => {
                 let cardStyle = "border-slate-200 bg-white hover:border-blue-200 shadow-sm";
                 let badgeStyle = "bg-slate-100 text-slate-500";
                 let badgeText = "Menunggu Review";
                 let Icon = Clock;

                 if (item.status === 'approved') {
                    cardStyle = "border-emerald-200 bg-emerald-50/40 opacity-90";
                    badgeStyle = "bg-emerald-100 text-emerald-700";
                    badgeText = "Disetujui";
                    Icon = CheckCircle2;
                 } else if (item.status === 'rejected') {
                    cardStyle = "border-red-300 bg-white shadow-md shadow-red-100";
                    badgeStyle = "bg-red-100 text-red-700";
                    badgeText = "Perlu Revisi";
                    Icon = AlertCircle;
                 }

                 return (
                 <div key={idx} className={`relative transition-all duration-300 rounded-[2.5rem] border-2 overflow-hidden ${cardStyle}`}>
                    <div className="p-8">
                       
                       {/* Header Per Poin (Nomor + Soal + Status Badge) */}
                       <div className="flex justify-between items-start gap-4 mb-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center font-black text-sm ${item.status === 'approved' ? 'bg-emerald-500 text-white' : item.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                               {idx + 1}
                            </div>
                            <p className="text-[15px] font-bold text-slate-700 leading-relaxed mt-1.5">{item.text || item.pointText}</p>
                          </div>
                          
                          <div className={`shrink-0 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${badgeStyle}`}>
                             <Icon size={12} strokeWidth={3} /> {badgeText}
                          </div>
                       </div>
                       
                       <div className="pl-14">
                         {/* Tampilkan Peringatan Dosen Jika Poin Ditolak */}
                         {item.status === 'rejected' && item.dosen_feedback && (
                            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
                               <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                               <div>
                                 <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Catatan Revisi dari Dosen:</span>
                                 <p className="text-xs text-red-700 font-medium leading-relaxed">{item.dosen_feedback}</p>
                               </div>
                            </div>
                         )}
                         
                         {/* Textarea Jawaban */}
                         <div className="relative mt-2">
                            <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest absolute -top-2 left-4 bg-white px-2">
                              Jawaban / Uraian Perbaikan Anda
                            </label>
                            <textarea 
                               disabled={item.status === 'approved' || isAcc}
                               value={item.jawaban_mhs}
                               onChange={(e) => handleUpdatePointAnswer(idx, e.target.value)}
                               placeholder="Tuliskan di mana perbaikan dilakukan (Contoh: Sudah diperbaiki di Bab 1 halaman 4...)"
                               className={`w-full min-h-[100px] p-5 rounded-2xl border-2 text-sm font-medium transition-all outline-none resize-none ${
                                  item.status === 'approved' 
                                  ? 'bg-emerald-50/50 border-emerald-100 text-slate-500 cursor-not-allowed' 
                                  : item.status === 'rejected'
                                  ? 'bg-white border-red-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
                                  : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                               }`}
                            />
                         </div>
                       </div>

                    </div>
                 </div>
                 )
               })}
               
               {pointAnswers.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada poin revisi yang diinput oleh Dosen.</p>
                 </div>
               )}
            </div>

            {/* Upload File & Submit */}
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-300 mt-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight mb-2">Lampiran Draft</h3>
                     <p className="text-slate-400 text-xs font-medium leading-relaxed mb-6">Unggah file PDF terbaru jika Anda melakukan perubahan pada dokumen skripsi.</p>
                     
                     <div className="relative group cursor-pointer">
                        <input type="file" accept=".pdf" onChange={(e) => setFileUploadForm(e.target.files?.[0] || null)} disabled={isAcc} className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" />
                        <div className={`p-6 border-2 border-dashed rounded-3xl flex items-center gap-4 transition-all ${isAcc ? 'border-slate-800 bg-slate-800/50 opacity-50' : 'border-slate-700 group-hover:bg-slate-800'}`}>
                           <div className="p-3 bg-slate-800 rounded-xl text-blue-400"><Upload size={20}/></div>
                           <div className="flex-1 min-w-0 pr-4">
                             <span className="block text-xs font-bold uppercase tracking-widest text-slate-300 truncate">
                                {fileUploadForm ? fileUploadForm.name : (feedback?.signedMhsFile ? "Timpa File PDF" : "Pilih File PDF")}
                             </span>
                             {feedback?.signedMhsFile && !fileUploadForm && (
                                <span className="block text-[9px] text-emerald-400 font-bold mt-1 tracking-widest">Tersimpan di sistem</span>
                             )}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <button 
                        onClick={handleSaveMatriks}
                        disabled={sending || isAcc || pointAnswers.length === 0}
                        className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                     >
                        {sending ? "Mengirim..." : <><Save size={20} /> Kirim Semua Perbaikan</>}
                     </button>
                     <p className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Tombol ini akan menyimpan progres jawaban Anda<br/>dan mengirim notifikasi ke dosen untuk diperiksa kembali.
                     </p>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}