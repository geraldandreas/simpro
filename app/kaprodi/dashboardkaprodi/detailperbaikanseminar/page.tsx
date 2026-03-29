"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, CheckCircle2, User, 
  Download, AlertCircle, Clock, ShieldCheck, Check, MessageSquareWarning, Send
} from 'lucide-react';

// Helper parse JSON agar data tidak error
const parseSafe = (data: any) => {
  try { return typeof data === 'string' ? JSON.parse(data) : data; } 
  catch (e) { return null; }
};

export default function DetailPerbaikanKaprodiPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center h-screen relative z-10 bg-[#F8F9FB]">
         <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </main>
    }>
      <DetailRevisiKaprodi />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchRuangRevisiKaprodi = async (request_id: string | null) => {
  if (!request_id) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: dosenProfile } = await supabase.from('profiles').select('ttd_url').eq('id', user.id).single();
  
  const { data: req } = await supabase.from('seminar_requests').select(`proposal:proposals ( id, judul, user:profiles ( nama, npm, avatar_url ) )`).eq('id', request_id).single();
  if (!req) throw new Error("Request tidak ditemukan");
  
  const rawProp = (req as any).proposal;
  const prop = Array.isArray(rawProp) ? rawProp[0] : rawProp;
  const mhsUser = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;

  const { data: fbData } = await supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', request_id).eq('dosen_id', user.id).single();
  
  let signedMhsFile = null;
  if (fbData && fbData.file_jawaban_url) { 
    const { data: mhsFile } = await supabase.storage.from('seminar_perbaikan').createSignedUrl(fbData.file_jawaban_url, 3600); 
    signedMhsFile = mhsFile?.signedUrl || null; 
  }

  return { 
    mhsInfo: mhsUser, 
    feedback: fbData ? { ...fbData, signedMhsFile } : null, 
    dosenTtdUrl: dosenProfile?.ttd_url || null,
    requestId: request_id
  };
};

function DetailRevisiKaprodi() {
  const searchParams = useSearchParams();
  const request_id = searchParams.get('id'); 
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR(
    request_id ? `revisi_kaprodi_v5_${request_id}` : null, 
    () => fetchRuangRevisiKaprodi(request_id), 
    { revalidateOnFocus: false }
  );

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [points, setPoints] = useState<any[]>([]);
  
  // State untuk form "Minta Revisi" per poin
  const [activeRejectId, setActiveRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const mhsInfo = data?.mhsInfo;
  const feedback = data?.feedback;
  const dosenTtdUrl = data?.dosenTtdUrl; 

  const isAcc = feedback?.status_revisi === 'diterima';

  // 🔥 PERBAIKAN LOGIKA PARSING DI SINI 🔥
  useEffect(() => {
    if (feedback) {
      const parsedCatatan = parseSafe(feedback.catatan_revisi);
      const parsedJawaban = parseSafe(feedback.jawaban_revisi);

      if (Array.isArray(parsedCatatan)) {
        // Jika catatan sudah JSON
        setPoints(parsedCatatan.map((cp, idx) => ({
          ...cp,
          jawaban_mhs: Array.isArray(parsedJawaban) ? (parsedJawaban[idx]?.answerText || "") : ""
        })));
      } else if (feedback.catatan_revisi) {
        // Jika catatan masih teks lama dari Word
        const lines = feedback.catatan_revisi.split('\n').filter((l:string)=>l.trim()!=='');
        setPoints(lines.map((text:string, idx:number) => {
          let ansText = "";
          // Deteksi apakah jawaban mahasiswa SUDAH format JSON baru
          if (Array.isArray(parsedJawaban)) {
             ansText = parsedJawaban[idx]?.answerText || "";
          } else if (idx === 0 && typeof feedback.jawaban_revisi === 'string' && !feedback.jawaban_revisi.includes('[{')) {
             ansText = feedback.jawaban_revisi;
          }
          
          return {
            text: text, 
            status: 'pending', 
            dosen_feedback: '',
            jawaban_mhs: ansText
          };
        }));
      }
    }
  }, [feedback]);

  // FUNGSI 1: DOSEN KLIK "MARK AS OK"
  const handleMarkOK = async (idx: number) => {
    if (!feedback) return;
    const newPoints = [...points];
    newPoints[idx].status = 'approved';
    newPoints[idx].dosen_feedback = ''; // Hapus komentar penolakan jika sudah di-OK
    setPoints(newPoints);
    setActiveRejectId(null);

    try {
      await supabase.from('seminar_feedbacks').update({
        catatan_revisi: JSON.stringify(newPoints.map(({jawaban_mhs, ...rest}) => rest))
      }).eq('id', feedback.id);
    } catch (e) { alert("Gagal memperbarui status poin."); }
  };

  // FUNGSI 2: DOSEN KLIK SIMPAN KOMENTAR PENOLAKAN
  const handleSaveReject = async (idx: number) => {
    if (!feedback) return;
    if (!rejectReason.trim()) return alert("Tuliskan alasan/komentar revisinya terlebih dahulu.");

    const newPoints = [...points];
    newPoints[idx].status = 'rejected';
    newPoints[idx].dosen_feedback = rejectReason.trim();
    setPoints(newPoints);

    try {
      // Simpan status revisi
      await supabase.from('seminar_feedbacks').update({
        catatan_revisi: JSON.stringify(newPoints.map(({jawaban_mhs, ...rest}) => rest)),
        status_revisi: 'revisi'
      }).eq('id', feedback.id);
      
      setActiveRejectId(null);
      setRejectReason("");
      alert("Catatan revisi dikirim ke mahasiswa.");
      mutate();
    } catch (e) { alert("Gagal mengirim catatan."); }
  };

  // FUNGSI 3: ACC FINAL JIKA SEMUA POIN SUDAH HIJAU
  const handleBerikanACC = async () => {
    if (!dosenTtdUrl) return alert("⚠️ PERHATIAN!\n\nAnda belum mengunggah Tanda Tangan Digital di menu Settings."); 
    if (!confirm(`Semua poin sudah disetujui. Yakin ingin memberikan ACC Final?`)) return;
    
    try {
      setUpdatingStatus(true);
      await supabase.from('seminar_feedbacks').update({ status_revisi: 'diterima' }).eq('id', feedback.id);
      alert("✅ Mahasiswa berhasil di-ACC!"); 
      mutate(); 
    } catch (err: any) { alert("Gagal ACC: " + err.message); } finally { setUpdatingStatus(false); }
  };

  if (!request_id || error) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB] text-red-500 font-black">Gagal memuat data</main>;
  if (isLoading && !data) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div></main>;

  const isAllApproved = points.length > 0 && points.every(p => p.status === 'approved');

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FB] relative z-10">
      
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 shrink-0 z-20">
        <button onClick={() => router.push('/kaprodi/dashboardkaprodi/perbaikanseminar')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-all">
          <ArrowLeft size={16} /> Kembali Ke Daftar Perbaikan
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ================= BAGIAN KIRI (PROFIL & TOMBOL DRAFT/ACC) ================= */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-0">
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center text-center shrink-0">
                <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 mb-4 overflow-hidden border-4 border-slate-50 shrink-0 flex items-center justify-center shadow-inner">
                  {mhsInfo?.avatar_url ? <img src={mhsInfo.avatar_url} className="object-cover w-full h-full" alt="Mhs" /> : <User size={32} className="text-slate-300" />}
                </div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">{mhsInfo?.nama || "Mahasiswa"}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{mhsInfo?.npm}</p>
                
                <div className={`mt-6 mb-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  isAcc ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {isAcc ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {isAcc ? 'Telah Anda ACC' : 'Menunggu Review Anda'}
                </div>

                {isAllApproved && !isAcc && (
                  <button disabled={updatingStatus} onClick={handleBerikanACC} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95">
                    <ShieldCheck size={18} /> Berikan ACC Final
                  </button>
                )}
              </div>

              {/* CARD UNDUH FILE MAHASISWA */}
              <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Lampiran Terbaru</h4>
                <p className="text-xs font-medium mb-6 opacity-90 leading-relaxed">Unduh draft skripsi yang telah diperbaiki mahasiswa untuk dicocokkan dengan jawabannya.</p>
                {feedback?.signedMhsFile ? (
                   <a href={feedback.signedMhsFile} target="_blank" className="flex items-center justify-between bg-white text-blue-600 p-4 rounded-2xl hover:bg-blue-50 transition-all group">
                     <span className="text-xs font-black uppercase tracking-widest">Buka PDF Draft</span>
                     <Download size={18} className="group-hover:translate-y-1 transition-transform" />
                   </a>
                ) : (
                   <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Belum Ada File</span>
                   </div>
                )}
              </div>

            </div>

            {/* ================= BAGIAN KANAN (DAFTAR REVIEW POIN INTERAKTIF) ================= */}
            <div className="lg:col-span-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 min-h-full">
                
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Review Jawaban Per Poin</h3>
                  <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Tinjau uraian mahasiswa. Setujui atau kembalikan dengan catatan.</p>
                </div>

                <div className="space-y-6">
                  {points.map((p, idx) => (
                    <div key={idx} className={`p-8 rounded-[2rem] border-2 transition-all ${p.status === 'approved' ? 'bg-emerald-50/50 border-emerald-100' : p.status === 'rejected' ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                      
                      <div className="flex justify-between items-start gap-6">
                        {/* KONTEN KIRI: SOAL & JAWABAN */}
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin Sidang #{idx+1}</span>
                          <p className="text-sm font-bold text-slate-800 mt-2 mb-5 leading-relaxed">{p.text || p.pointText}</p>
                          
                          <div className={`border p-5 rounded-2xl ${p.status === 'approved' ? 'bg-white border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                             <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-2">Jawaban Mahasiswa:</span>
                             <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {p.jawaban_mhs ? p.jawaban_mhs : <span className="text-slate-400 italic">Belum ada jawaban...</span>}
                             </p>
                          </div>

                          {/* Jika poin ini ditolak, tampilkan komentar dosen sebelumnya */}
                          {p.status === 'rejected' && activeRejectId !== idx && (
                             <div className="mt-4 p-4 bg-white border border-red-200 rounded-xl flex gap-3">
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Komentar Evaluasi Anda:</span>
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{p.dosen_feedback}</p>
                                </div>
                             </div>
                          )}
                        </div>

                        {/* KONTEN KANAN: TOMBOL AKSI */}
                        <div className="shrink-0 flex flex-col gap-2">
                           <button 
                             onClick={() => handleMarkOK(idx)} disabled={isAcc}
                             className={`w-full px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                               p.status === 'approved' 
                               ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200' 
                               : 'bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                             }`}
                           >
                             {p.status === 'approved' ? <><Check size={14} className="inline mr-1"/> OK Selesai</> : 'Mark as OK'}
                           </button>

                           {p.status !== 'approved' && !isAcc && (
                              <button 
                                onClick={() => {
                                  setActiveRejectId(activeRejectId === idx ? null : idx);
                                  setRejectReason(p.dosen_feedback || ""); // Load tulisan sebelumnya jika ada
                                }}
                                className={`w-full px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                  activeRejectId === idx || p.status === 'rejected'
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                }`}
                              >
                                <MessageSquareWarning size={14} className="inline mr-1"/> Revisi
                              </button>
                           )}
                        </div>
                      </div>

                      {/* AREA FORM PENOLAKAN (Muncul Jika Klik Tombol Revisi) */}
                      {activeRejectId === idx && (
                         <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Tuliskan Kekurangan Pada Poin Ini:</label>
                            <textarea 
                               autoFocus
                               value={rejectReason}
                               onChange={(e) => setRejectReason(e.target.value)}
                               placeholder="Contoh: Jawaban ini salah, tolong tambahkan teori X di bab 2..."
                               rows={3}
                               className="w-full p-4 bg-white border border-red-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                            <div className="flex justify-end gap-3 mt-3">
                               <button onClick={() => setActiveRejectId(null)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600">Batal</button>
                               <button onClick={() => handleSaveReject(idx)} disabled={!rejectReason.trim()} className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50">
                                  <Send size={12}/> Kirim Catatan
                               </button>
                            </div>
                         </div>
                      )}

                    </div>
                  ))}

                  {points.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada poin revisi.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}