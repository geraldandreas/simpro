"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { sendNotification } from "@/lib/notificationUtils";
import { 
  ArrowLeft, CheckCircle2, User, 
  FileText, Download, AlertCircle, ShieldCheck, Save, XCircle
} from 'lucide-react';

const parseSafe = (data: any) => {
  try { return typeof data === 'string' ? JSON.parse(data) : data; } 
  catch (e) { return null; }
};

export default function DetailPerbaikanSeminarKaprodiPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center h-screen relative z-10 bg-[#F8F9FB]">
         <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </main>
    }>
      <DetailRevisiDosen />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchRuangRevisiDosen = async (request_id: string | null) => {
  if (!request_id) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: dosenProfile } = await supabase.from('profiles').select('ttd_url').eq('id', user.id).single();
  const { data: req } = await supabase.from('seminar_requests').select(`proposal:proposals ( id, judul, user:profiles ( id, nama, npm, avatar_url ) )`).eq('id', request_id).single();
  if (!req) throw new Error("Request tidak ditemukan");
  
  const rawProp = (req as any).proposal;
  const prop = Array.isArray(rawProp) ? rawProp[0] : rawProp;
  const mhsUser = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;

  const [ { data: fbData }, { data: sups }, { data: exms }, { data: sched } ] = await Promise.all([
    supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', request_id).eq('dosen_id', user.id).single(),
    supabase.from('thesis_supervisors').select('role, dosen_id, dosen:profiles(nama)').eq('proposal_id', prop.id),
    supabase.from('examiners').select('role, dosen_id, dosen:profiles(nama)').eq('seminar_request_id', request_id),
    supabase.from('seminar_schedules').select('tanggal').eq('seminar_request_id', request_id).maybeSingle()
  ]);
  
  let signedDosenFile = null;
  let signedMhsFile = null;
  if (fbData) {
    if (fbData.file_revisi_url) { const { data: initFile } = await supabase.storage.from('feedback_seminar').createSignedUrl(fbData.file_revisi_url, 3600); signedDosenFile = initFile?.signedUrl || null; }
    if (fbData.file_jawaban_url) { const { data: mhsFile } = await supabase.storage.from('seminar_perbaikan').createSignedUrl(fbData.file_jawaban_url, 3600); signedMhsFile = mhsFile?.signedUrl || null; }
  }

  let exportData = {
    namaMhs: mhsUser?.nama, npmMhs: mhsUser?.npm, judul: prop?.judul,
    tanggal: sched?.tanggal || "..................................................................",
    pembimbing1: "..................................................................", pembimbing2: "..................................................................",
    penguji1: "..................................................................", penguji2: "..................................................................", penguji3: "..................................................................",
    roleDosenIni: ""
  };

 let detectedRole = "";
  if (sups) { 
    const sup1 = sups.find((s:any) => s.role?.toLowerCase().includes('utama') || s.role?.toLowerCase().includes('pembimbing1'));
    const sup2 = sups.find((s:any) => s.role?.toLowerCase().includes('pendamping') || s.role?.toLowerCase().includes('pembimbing2'));
    
    // 🔥 PERBAIKAN TYPESCRIPT: Cek Array & Typecast ke any 🔥
    exportData.pembimbing1 = (Array.isArray(sup1?.dosen) ? sup1?.dosen[0]?.nama : (sup1?.dosen as any)?.nama) || exportData.pembimbing1;
    exportData.pembimbing2 = (Array.isArray(sup2?.dosen) ? sup2?.dosen[0]?.nama : (sup2?.dosen as any)?.nama) || exportData.pembimbing2;
    
    const mySup = sups.find((s:any) => String(s.dosen_id) === String(user.id));
    if (mySup) {
      const r = mySup.role?.toLowerCase() || '';
      if (r.includes('utama') || r.includes('pembimbing1')) detectedRole = 'pembimbing1';
      else if (r.includes('pendamping') || r.includes('pembimbing2')) detectedRole = 'pembimbing2';
      else detectedRole = mySup.role;
    }
  }

 if (exms) { 
    const exm1 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji1'));
    const exm2 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji2'));
    const exm3 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji3'));
    
    // 🔥 PERBAIKAN TYPESCRIPT: Cek Array & Typecast ke any 🔥
    exportData.penguji1 = (Array.isArray(exm1?.dosen) ? exm1?.dosen[0]?.nama : (exm1?.dosen as any)?.nama) || exportData.penguji1;
    exportData.penguji2 = (Array.isArray(exm2?.dosen) ? exm2?.dosen[0]?.nama : (exm2?.dosen as any)?.nama) || exportData.penguji2;
    exportData.penguji3 = (Array.isArray(exm3?.dosen) ? exm3?.dosen[0]?.nama : (exm3?.dosen as any)?.nama) || exportData.penguji3;
    
    if (!detectedRole) {
      const myExm = exms.find((e:any) => String(e.dosen_id) === String(user.id));
      if (myExm) {
        const r = myExm.role?.toLowerCase() || '';
        if (r.includes('penguji1')) detectedRole = 'penguji1';
        else if (r.includes('penguji2')) detectedRole = 'penguji2';
        else if (r.includes('penguji3')) detectedRole = 'penguji3';
        else detectedRole = myExm.role;
      }
    }
  }
  exportData.roleDosenIni = detectedRole; 

  return { mhsInfo: mhsUser, feedback: fbData ? { ...fbData, signedDosenFile, signedMhsFile } : null, exportData, dosenTtdUrl: dosenProfile?.ttd_url || null };
};

function DetailRevisiDosen() {
  const searchParams = useSearchParams();
  const request_id = searchParams.get('id'); 
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR(
    request_id ? `revisi_dosen_v2_${request_id}` : null, 
    () => fetchRuangRevisiDosen(request_id), 
    { revalidateOnFocus: false }
  );

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pointData, setPointData] = useState<any[]>([]);

  const mhsInfo = data?.mhsInfo;
  const feedback = data?.feedback;
  const expData = data?.exportData;
  const dosenTtdUrl = data?.dosenTtdUrl; 

  const isAcc = feedback?.status_revisi === 'diterima';

  // Sinkronisasi data JSON ke Point Review
  // Sinkronisasi data JSON ke Point Review
  useEffect(() => {
    if (feedback) {
      // 1. Coba baca catatan (Apakah JSON atau Teks Biasa)
      let parsedCatatan = null;
      try {
        parsedCatatan = JSON.parse(feedback.catatan_revisi);
      } catch (e) {
        parsedCatatan = feedback.catatan_revisi; // Tetap teks jika bukan JSON
      }

      // 2. Coba baca jawaban
      let parsedJawaban = null;
      try {
        parsedJawaban = JSON.parse(feedback.jawaban_revisi);
      } catch (e) {
        parsedJawaban = feedback.jawaban_revisi;
      }
      
      let points: any[] = [];
      
      if (Array.isArray(parsedCatatan)) {
        // Jika sudah format JSON baru
        points = parsedCatatan.map((c, i) => ({
          ...c,
          student_answer: Array.isArray(parsedJawaban) ? (parsedJawaban[i]?.answerText || "") : ""
        }));
      } else if (typeof parsedCatatan === 'string' && parsedCatatan.trim() !== '') {
        // Fallback jika data lama masih format Teks Biasa (dipisah per baris/enter)
        const lines = parsedCatatan.split('\n').filter((l: string) => l.trim() !== '');
        points = lines.map((text: string, idx: number) => {
          let ansText = "";
          if (Array.isArray(parsedJawaban)) {
            ansText = parsedJawaban[idx]?.answerText || "";
          } else if (idx === 0 && typeof parsedJawaban === 'string' && !parsedJawaban.includes('[{')) {
            ansText = parsedJawaban;
          }
          return { text: text, status: 'pending', dosen_feedback: '', student_answer: ansText };
        });
      }
      
      setPointData(points);
    }
  }, [feedback]);

  // Fungsi Toggle Status Poin (Terima / Tolak)
  const handlePointStatus = (idx: number, status: string) => {
    const newPoints = [...pointData];
    newPoints[idx].status = status;
    if (status === 'approved') newPoints[idx].dosen_feedback = ''; // Kosongkan feedback jika di-ACC
    setPointData(newPoints);
  };

  // Fungsi Ketik Feedback Penolakan
  const handlePointFeedback = (idx: number, text: string) => {
    const newPoints = [...pointData];
    newPoints[idx].dosen_feedback = text;
    setPointData(newPoints);
  };

  // ================= FUNGSI EXPORT WORD MATRIKS =================
  const handleExportWord = () => { 
    if (!expData) return;
    const formattedDate = expData.tanggal.includes("-") ? new Date(expData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : expData.tanggal;
    
    const generateRow = (no: number, labelTitle: string, namaDosen: string, roleKey: string) => {
      const isThisDosen = expData.roleDosenIni === roleKey;
      let uraianHtml = "<br><br><br>";
      let jawabanHtml = "<br><br><br>";

      // 🔥 Dosen Feedback diabaikan di Word sesuai permintaan 🔥
      if (isThisDosen && pointData.length > 0) {
         uraianHtml = pointData.map((p, i) => `${String.fromCharCode(65 + i)}. ${p.text || p.pointText || ''}`).join('<br><br>');
         jawabanHtml = pointData.map((p, i) => `${String.fromCharCode(65 + i)}. ${p.student_answer || 'Belum ada jawaban'}`).join('<br><br>');
      }
      
      const ttdHtml = (isThisDosen && dosenTtdUrl && isAcc) 
        ? `<div style="text-align: center;"><img src="${dosenTtdUrl}" width="98" height="95" style="width: 2.6cm; height: 2.51cm;" alt="TTD" /></div>` 
        : "";

      return `<tr><td style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: center;">${no}.</td><td style="border: 1px solid black; padding: 8px; vertical-align: top;">${labelTitle}<br/><strong>${namaDosen !== ".................................................................." ? namaDosen : ""}</strong><br/><br/>${uraianHtml}</td><td style="border: 1px solid black; padding: 8px; vertical-align: top;"><br/><br/>${jawabanHtml}</td><td style="border: 1px solid black; padding: 8px; vertical-align: middle;">${ttdHtml}</td></tr>`;
    };

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Matriks Perbaikan</title></head><body><div style="text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; line-height: 1.5; font-size: 14pt;">MATRIKS PERBAIKAN SKRIPSI<br>PROGRAM STUDI TEKNIK INFORMATIKA<br>FAKULTAS MATEMATIKA DAN ILMU PENGETAHUAN ALAM<br>UNIVERSITAS PADJADJARAN</div><br><br><table style="font-family: 'Times New Roman', Times, serif; border: none; width: 100%; font-size: 12pt;"><tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>${expData.namaMhs || '..................................................................'}</td></tr><tr><td>NPM</td><td>:</td><td>${expData.npmMhs || '..................................................................'}</td></tr><tr><td>Tanggal Sidang</td><td>:</td><td>${formattedDate}</td></tr><tr><td>Judul Skripsi</td><td>:</td><td>${expData.judul || '..................................................................'}</td></tr><tr><td>Pembimbing 1</td><td>:</td><td>${expData.pembimbing1}</td></tr><tr><td>Pembimbing 2</td><td>:</td><td>${expData.pembimbing2}</td></tr><tr><td>Penguji 1</td><td>:</td><td>${expData.penguji1}</td></tr><tr><td>Penguji 2</td><td>:</td><td>${expData.penguji2}</td></tr><tr><td>Penguji 3</td><td>:</td><td>${expData.penguji3}</td></tr></table><br><br><table style="font-family: 'Times New Roman', Times, serif; border-collapse: collapse; width: 100%; border: 1px solid black; font-size: 12pt;"><thead><tr><th style="border: 1px solid black; padding: 8px; width: 5%;">No</th><th style="border: 1px solid black; padding: 8px; width: 45%;">Uraian masukan pembimbing dan penguji (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 40%;">Uraian Perbaikan yang sudah dilakukan (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 10%;">TTD</th></tr></thead><tbody>${generateRow(1, 'Pembimbing 1', expData.pembimbing1, 'pembimbing1')}${generateRow(2, 'Pembimbing 2', expData.pembimbing2, 'pembimbing2')}${generateRow(3, 'Penguji 1', expData.penguji1, 'penguji1')}${generateRow(4, 'Penguji 2', expData.penguji2, 'penguji2')}${generateRow(5, 'Penguji 3', expData.penguji3, 'penguji3')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; const mhsName = expData.namaMhs ? expData.namaMhs.replace(/\s+/g, '_') : 'Mahasiswa'; link.download = `Matriks_Perbaikan_${mhsName}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // 🔥 FUNGSI SIMPAN PENILAIAN PER-POIN & TENTUKAN STATUS GLOBAL 🔥
  const handleSaveReview = async () => {
    if (!feedback) return;

    // Validasi: Jika ada yang ditolak, dosen WAJIB mengisi alasan penolakannya
    const hasEmptyFeedback = pointData.some(p => p.status === 'rejected' && (!p.dosen_feedback || p.dosen_feedback.trim() === ''));
    if (hasEmptyFeedback) return alert("⚠️ Anda menolak poin perbaikan, namun ada kolom 'Alasan Penolakan' yang belum diisi. Harap lengkapi terlebih dahulu.");

    // Tentukan Status Global (Berdasarkan Poin)
    const isAnyRejected = pointData.some(p => p.status === 'rejected');
    const isAllApproved = pointData.every(p => p.status === 'approved');
    
    let newGlobalStatus = 'diperiksa';
    if (isAnyRejected) newGlobalStatus = 'revisi';
    else if (isAllApproved) newGlobalStatus = 'diterima';

    if (newGlobalStatus === 'diterima' && !dosenTtdUrl) {
      return alert("⚠️ PERHATIAN!\n\nUntuk memberikan ACC (Status Diterima), Anda wajib mengunggah Tanda Tangan Digital di menu Settings.");
    }

    if (!confirm(`Apakah Anda yakin ingin menyimpan hasil ulasan ini?\nStatus akhir mahasiswa akan diatur sebagai: ${newGlobalStatus.toUpperCase()}`)) return;

    try {
      setUpdatingStatus(true);

      // Siapkan JSON baru yang menggabungkan status dan dosen_feedback
      const newCatatan = pointData.map(p => ({
        text: p.text || p.pointText,
        status: p.status,
        dosen_feedback: p.status === 'rejected' ? p.dosen_feedback : ""
      }));

      await supabase.from('seminar_feedbacks').update({ 
        catatan_revisi: JSON.stringify(newCatatan),
        status_revisi: newGlobalStatus 
      }).eq('id', feedback.id);

      const studentId = mhsInfo?.id; 
      
      if (studentId) {
        const titleNotif = newGlobalStatus === 'diterima' ? "Revisi Seminar Di-ACC " : "Revisi Seminar Ditolak ";
        const messageNotif = newGlobalStatus === 'diterima' 
          ? `Selamat! Revisi poin-poin seminar Anda telah disetujui sepenuhnya oleh ${expData?.roleDosenIni || 'Dosen Penguji'}.`
          : `Terdapat poin revisi yang ditolak atau memerlukan perbaikan lebih lanjut dari ${expData?.roleDosenIni || 'Dosen Penguji'}. Silakan cek catatan revisi terbaru di dashboard Anda.`;

        await sendNotification(studentId, titleNotif, messageNotif);
      }
      
      alert(newGlobalStatus === 'diterima' ? " Berhasil! Mahasiswa telah di-ACC." : " Hasil review dikirim ke Mahasiswa.");
      mutate(); 
    } catch (err: any) { 
      alert("Gagal menyimpan hasil: " + err.message); 
    } finally { 
      setUpdatingStatus(false); 
    }
  };

  if (!request_id || error) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB] text-red-500 font-black">Gagal memuat data</main>;
  if (isLoading && !data) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></main>;

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FB] relative z-10">
      
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto w-full">
          
          <div className="mb-10">
            <button 
              onClick={() => router.back()}
              className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
            >
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
                KEMBALI KE PERBAIKAN SEMINAR
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* ================= BAGIAN KIRI (PROFIL & SIMPAN) ================= */}
            <div className="lg:col-span-4 flex flex-col h-fit sticky top-10 gap-6">
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center text-center shrink-0">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 mb-4 overflow-hidden border-4 border-slate-50 shrink-0 flex items-center justify-center font-black text-slate-300 shadow-inner">
                  {mhsInfo?.avatar_url ? <img src={mhsInfo.avatar_url} className="object-cover w-full h-full" alt="Mhs" /> : <User size={40} />}
                </div>
                <h2 className="text-lg font-black text-slate-800 capitalize tracking-tight leading-tight">{mhsInfo?.nama?.toLowerCase() || "Mahasiswa"}</h2>
                <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">{mhsInfo?.npm}</p>
                
                <div className="w-full h-[1px] bg-slate-100 my-8"></div>
                
                <div className="w-full">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Status Mahasiswa Saat Ini</p>
                  <div className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border ${
                    isAcc ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {isAcc ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                    {isAcc ? 'Selesai / ACC' : 'Proses Revisi'}
                  </div>
                </div>
              </div>

              {/* Box Aksi Simpan Review */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                 <h3 className="font-black text-sm uppercase mb-2 tracking-widest">Kirim Hasil Review</h3>
                 <p className="text-xs text-slate-400 mb-6 leading-relaxed">Sistem akan otomatis menentukan status ACC atau Revisi berdasarkan poin yang Anda setujui/tolak di samping.</p>
                 <button disabled={updatingStatus} onClick={handleSaveReview} className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95">
                   {updatingStatus ? "MEMPROSES..." : <><Save size={16}/> Simpan & Kirim</>}
                 </button>
              </div>

            </div>

            {/* ================= BAGIAN KANAN (DAFTAR REVIEW POIN & MATRIKS) ================= */}
            <div className="lg:col-span-8 space-y-8">
              
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 relative">
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Review Perbaikan</h3>
                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Tinjau setiap poin perbaikan dari Mahasiswa</p>
                  </div>
                </div>

                {pointData.map((point, idx) => (
                  <div key={idx} className={`border-2 rounded-[2rem] p-8 mb-6 transition-all duration-300 ${point.status === 'approved' ? 'border-emerald-200 bg-emerald-50/40' : point.status === 'rejected' ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-white shadow-sm'}`}>
                     <div className="flex flex-col sm:flex-row gap-6">
                       
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${point.status === 'approved' ? 'bg-emerald-500 text-white' : point.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                         {idx + 1}
                       </div>
                       
                       <div className="flex-1">
                          <p className="text-[15px] font-bold text-slate-700 leading-relaxed mb-4">{point.text || point.pointText}</p>
                          
                          <div className="p-5 bg-white border border-slate-200 shadow-inner rounded-2xl mb-6">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-2">Jawaban / Uraian Mahasiswa:</span>
                            <p className="text-[13px] font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                              {point.student_answer || <span className="italic text-slate-400">Mahasiswa belum menginput jawaban.</span>}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                             <button onClick={() => handlePointStatus(idx, 'approved')} className={`px-5 py-3 rounded-xl text-[11px] font-black flex items-center gap-2 border transition-all uppercase tracking-widest active:scale-95 ${point.status === 'approved' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}>
                               <CheckCircle2 size={16}/> Terima Poin Ini
                             </button>
                             <button onClick={() => handlePointStatus(idx, 'rejected')} className={`px-5 py-3 rounded-xl text-[11px] font-black flex items-center gap-2 border transition-all uppercase tracking-widest active:scale-95 ${point.status === 'rejected' ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-200' : 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600'}`}>
                               <XCircle size={16}/> Tolak & Minta Revisi
                             </button>
                          </div>

                          {point.status === 'rejected' && (
                             <div className="mt-8 animate-in slide-in-from-top-2 duration-200">
                               <textarea 
                                 value={point.dosen_feedback} 
                                 onChange={(e) => handlePointFeedback(idx, e.target.value)} 
                                 placeholder="Berikan alasan mengapa poin ini ditolak/masih salah..." 
                                 className="w-full p-5 border-2 border-red-200 rounded-2xl text-sm font-medium outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-white resize-none" 
                                 rows={3}
                               />
                             </div>
                          )}
                       </div>
                     </div>
                  </div>
                ))}
                
                {pointData.length === 0 && (
                   <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada poin revisi yang tercatat.</p>
                   </div>
                )}
              </div>

             {/* Download Draft Skripsi (Hanya 1 Kolom Penuh) */}
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><FileText size={16} /> Draft Skripsi Terbaru</label>
                  <p className="text-xs text-slate-500 font-medium">Unduh file draft perbaikan dokumen skripsi terbaru yang telah diunggah oleh Mahasiswa.</p>
                </div>
                {feedback?.signedMhsFile ? (
                  <a href={feedback.signedMhsFile} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Download size={20} /></div>
                       <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Unduh Berkas Draft (.pdf)</span>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center justify-center h-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={16}/> File Belum Tersedia</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </main>
  );
}