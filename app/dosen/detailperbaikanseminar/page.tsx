"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, CheckCircle2, User, 
  FileText, Download, AlertCircle, Clock, ShieldCheck, MessageSquare, Send, Paperclip
} from 'lucide-react';

export default function DetailPerbaikanDosenPage() {
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
  
  const { data: req } = await supabase.from('seminar_requests').select(`proposal:proposals ( id, judul, user:profiles ( nama, npm, avatar_url ) )`).eq('id', request_id).single();
  if (!req) throw new Error("Request tidak ditemukan");
  
  const rawProp = (req as any).proposal;
  const prop = Array.isArray(rawProp) ? rawProp[0] : rawProp;
  const mhsUser = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;

  const [ { data: fbData }, { data: chatHistory }, { data: sups }, { data: exms }, { data: sched } ] = await Promise.all([
    supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', request_id).eq('dosen_id', user.id).single(),
    supabase.from('seminar_revision_chats').select('*').eq('seminar_request_id', request_id).eq('dosen_id', user.id).order('created_at', { ascending: true }),
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

  const chatsWithUrls = await Promise.all((chatHistory || []).map(async (chat) => {
    if (chat.file_url) {
      const bucket = chat.sender_role === 'dosen' ? 'feedback_seminar' : 'seminar_perbaikan';
      const { data: sData } = await supabase.storage.from(bucket).createSignedUrl(chat.file_url, 3600);
      return { ...chat, file_url: sData?.signedUrl || null };
    }
    return chat;
  }));

  // 4. Setup Data Export Word
  let exportData = {
    namaMhs: mhsUser?.nama, npmMhs: mhsUser?.npm, judul: prop?.judul,
    tanggal: sched?.tanggal || "..................................................................",
    pembimbing1: "..................................................................", pembimbing2: "..................................................................",
    penguji1: "..................................................................", penguji2: "..................................................................", penguji3: "..................................................................",
    roleDosenIni: ""
  };

  // 🔥 PERBAIKAN: LOGIKA PELACAK DOSEN (ANTI-TYPO & MULTI-TABEL) 🔥
  let detectedRole = "";

  if (sups) { 
    // Ambil nama pembimbing
    const sup1 = sups.find((s:any) => s.role?.toLowerCase().includes('utama') || s.role?.toLowerCase().includes('pembimbing1'));
    const sup2 = sups.find((s:any) => s.role?.toLowerCase().includes('pendamping') || s.role?.toLowerCase().includes('pembimbing2'));
    exportData.pembimbing1 = sup1?.dosen?.nama || exportData.pembimbing1;
    exportData.pembimbing2 = sup2?.dosen?.nama || exportData.pembimbing2;

    // Cek apakah dosen yang login adalah Pembimbing
    const mySup = sups.find((s:any) => String(s.dosen_id) === String(user.id));
    if (mySup) {
      const r = mySup.role?.toLowerCase() || '';
      if (r.includes('utama') || r.includes('pembimbing1')) detectedRole = 'pembimbing1';
      else if (r.includes('pendamping') || r.includes('pembimbing2')) detectedRole = 'pembimbing2';
      else detectedRole = mySup.role;
    }
  }

  if (exms) { 
    // Ambil nama penguji
    const exm1 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji1'));
    const exm2 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji2'));
    const exm3 = exms.find((e:any) => e.role?.toLowerCase().includes('penguji3'));
    exportData.penguji1 = exm1?.dosen?.nama || exportData.penguji1;
    exportData.penguji2 = exm2?.dosen?.nama || exportData.penguji2;
    exportData.penguji3 = exm3?.dosen?.nama || exportData.penguji3;

    // Jika tadi belum ketemu di Pembimbing, cek di Penguji
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

  // Simpan role yang sudah dikonversi menjadi standar baku aplikasi
  exportData.roleDosenIni = detectedRole; 

  return { 
    mhsInfo: mhsUser, 
    feedback: fbData ? { ...fbData, signedDosenFile, signedMhsFile } : null, 
    chats: chatsWithUrls, 
    exportData, 
    dosenTtdUrl: dosenProfile?.ttd_url || null 
  };
};

function DetailRevisiDosen() {
  const searchParams = useSearchParams();
  const request_id = searchParams.get('id'); 
  const router = useRouter();
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  const { data, error, isLoading, mutate } = useSWR(
    request_id ? `revisi_dosen_${request_id}` : null, 
    () => fetchRuangRevisiDosen(request_id), 
    { revalidateOnFocus: false }
  );

  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Chat States (Kiri)
  const [chatText, setChatText] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [sendingChat, setSendingChat] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chats]);

  const mhsInfo = data?.mhsInfo;
  const feedback = data?.feedback;
  const expData = data?.exportData;
  const dosenTtdUrl = data?.dosenTtdUrl; 
  const chats = data?.chats || [];

  const isAcc = feedback?.status_revisi === 'diterima';
  const isReviewing = feedback?.status_revisi === 'diperiksa';

  // ================= FUNGSI EXPORT WORD MATRIKS =================
  const handleExportWord = () => { 
    if (!expData) return;
    const formattedDate = expData.tanggal.includes("-") ? new Date(expData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : expData.tanggal;
    const formatText = (text: string) => { if (!text) return "<br><br><br>"; const lines = text.split('\n').filter(l => l.trim() !== ''); if (lines.length === 0) return "<br><br><br>"; return lines.map((line, idx) => `${String.fromCharCode(65 + idx)}. ${line}`).join('<br><br>'); };
    const generateRow = (no: number, labelTitle: string, namaDosen: string, roleKey: string) => {
      const isThisDosen = expData.roleDosenIni === roleKey;
      const uraianDosen = isThisDosen ? (feedback?.catatan_revisi || "") : ""; 
      const jawabanMhs = isThisDosen ? (feedback?.jawaban_revisi || "") : ""; 
      return `<tr><td style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: center;">${no}.</td><td style="border: 1px solid black; padding: 8px; vertical-align: top;">${labelTitle}<br/><strong>${namaDosen !== ".................................................................." ? namaDosen : ""}</strong><br/><br/>${formatText(uraianDosen)}</td><td style="border: 1px solid black; padding: 8px; vertical-align: top;"><br/><br/>${formatText(jawabanMhs)}</td><td style="border: 1px solid black; padding: 8px;"></td></tr>`;
    };
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Matriks Perbaikan</title></head><body><div style="text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; line-height: 1.5; font-size: 14pt;">MATRIKS PERBAIKAN SKRIPSI<br>PROGRAM STUDI TEKNIK INFORMATIKA<br>FAKULTAS MATEMATIKA DAN ILMU PENGETAHUAN ALAM<br>UNIVERSITAS PADJADJARAN</div><br><br><table style="font-family: 'Times New Roman', Times, serif; border: none; width: 100%; font-size: 12pt;"><tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>${expData.namaMhs || '..................................................................'}</td></tr><tr><td>NPM</td><td>:</td><td>${expData.npmMhs || '..................................................................'}</td></tr><tr><td>Tanggal Sidang</td><td>:</td><td>${formattedDate}</td></tr><tr><td>Judul Skripsi</td><td>:</td><td>${expData.judul || '..................................................................'}</td></tr><tr><td>Pembimbing 1</td><td>:</td><td>${expData.pembimbing1}</td></tr><tr><td>Pembimbing 2</td><td>:</td><td>${expData.pembimbing2}</td></tr><tr><td>Penguji 1</td><td>:</td><td>${expData.penguji1}</td></tr><tr><td>Penguji 2</td><td>:</td><td>${expData.penguji2}</td></tr><tr><td>Penguji 3</td><td>:</td><td>${expData.penguji3}</td></tr></table><br><br><table style="font-family: 'Times New Roman', Times, serif; border-collapse: collapse; width: 100%; border: 1px solid black; font-size: 12pt;"><thead><tr><th style="border: 1px solid black; padding: 8px; width: 5%;">No</th><th style="border: 1px solid black; padding: 8px; width: 45%;">Uraian masukan pembimbing dan penguji (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 40%;">Uraian Perbaikan yang sudah dilakukan (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 10%;">TTD</th></tr></thead><tbody>${generateRow(1, 'Pembimbing 1', expData.pembimbing1, 'pembimbing1')}${generateRow(2, 'Pembimbing 2', expData.pembimbing2, 'pembimbing2')}${generateRow(3, 'Penguji 1', expData.penguji1, 'penguji1')}${generateRow(4, 'Penguji 2', expData.penguji2, 'penguji2')}${generateRow(5, 'Penguji 3', expData.penguji3, 'penguji3')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; const mhsName = expData.namaMhs ? expData.namaMhs.replace(/\s+/g, '_') : 'Mahasiswa'; link.download = `Matriks_Perbaikan_${mhsName}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // 🔥 FUNGSI UPDATE STATUS ACC/TAHAN (KIRI ATAS) 🔥
  const handleChangeStatus = async (newStatus: string) => {
    if (newStatus === 'diterima' && !dosenTtdUrl) {
      alert("⚠️ PERHATIAN!\n\nAnda belum mengunggah Tanda Tangan Digital di menu Settings."); return; 
    }
    if (!confirm(`Yakin ingin mengubah status menjadi: ${newStatus.toUpperCase()}?`)) return;
    try {
      setUpdatingStatus(true);
      await supabase.from('seminar_feedbacks').update({ status_revisi: newStatus }).eq('id', feedback.id);
      if (newStatus === 'diterima') alert("✅ Mahasiswa berhasil di-ACC!"); 
      else alert("⚠️ Status dikembalikan menjadi Perlu Revisi.");
      mutate(); 
    } catch (err: any) { alert("Gagal mengubah status: " + err.message); } finally { setUpdatingStatus(false); }
  };

  // 🔥 FUNGSI KIRIM CHAT INFORMAL (KIRI BAWAH) 🔥
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() && !chatFile) return;
    try {
      setSendingChat(true);
      const { data: { user } } = await supabase.auth.getUser();
      let filePath = null;
      if (chatFile && user) {
        filePath = `${request_id}/${Date.now()}_chat_${chatFile.name}`;
        await supabase.storage.from('feedback_seminar').upload(filePath, chatFile, { upsert: true });
      }
      await supabase.from('seminar_revision_chats').insert({
        seminar_request_id: request_id, dosen_id: user?.id, sender_role: 'dosen', pesan: chatText.trim(), file_url: filePath
      });
      // Otomatis ubah status form kembali ke "Revisi" jika Dosen mengirim chat minta perbaikan lagi
      await supabase.from('seminar_feedbacks').update({ status_revisi: 'revisi' }).eq('id', feedback.id);
      
      setChatText(""); setChatFile(null); mutate();
    } catch (err: any) { alert("Gagal mengirim pesan."); } finally { setSendingChat(false); }
  };

  if (!request_id || error) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB] text-red-500 font-black">Gagal memuat data</main>;
  if (isLoading && !data) return <main className="flex-1 flex items-center justify-center h-screen bg-[#F8F9FB]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div></main>;

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FB] relative z-10">
      
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 shrink-0 z-20">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-all">
          <ArrowLeft size={16} /> Kembali Ke Daftar Mahasiswa
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ================= BAGIAN KIRI (PROFIL, STATUS, & DISKUSI CHAT) ================= */}
            <div className="lg:col-span-4 flex flex-col h-[calc(100vh-160px)] sticky top-0 gap-6">
              
              {/* Info Mhs & Kontrol Status */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-center text-center shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mb-3 overflow-hidden border-2 border-slate-50 shrink-0 flex items-center justify-center font-black text-slate-300 shadow-inner">
                  {mhsInfo?.avatar_url ? <img src={mhsInfo.avatar_url} className="object-cover w-full h-full" alt="Mhs" /> : <User size={24} />}
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{mhsInfo?.nama || "Mahasiswa"}</h2>
                
                <div className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  isAcc ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : isReviewing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {isAcc ? <CheckCircle2 size={14} /> : isReviewing ? <Clock size={14} /> : <AlertCircle size={14} />}
                  {isAcc ? 'Telah Anda ACC' : isReviewing ? 'Mhs Kirim Perbaikan' : 'Masih Revisi'}
                </div>

                <div className="w-full grid grid-cols-2 gap-2 mt-4">
                  <button disabled={isAcc || updatingStatus} onClick={() => handleChangeStatus('revisi')} className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                    feedback?.status_revisi === 'revisi' ? 'border-red-400 bg-red-50 text-red-600 opacity-50 cursor-not-allowed' : isAcc ? 'border-slate-100 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed' : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600'
                  }`}>
                    <AlertCircle size={16} /> Tahan Revisi
                  </button>
                  <button disabled={isAcc || updatingStatus} onClick={() => handleChangeStatus('diterima')} className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                    isAcc ? 'border-emerald-500 bg-emerald-500 text-white cursor-not-allowed shadow-lg shadow-emerald-200' : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}>
                    <ShieldCheck size={16} /> Berikan ACC
                  </button>
                </div>
              </div>

              {/* Chat Card (Informal) */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden relative">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-blue-500"/> Diskusi Revisi Tambahan</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                  {chats.length === 0 ? (
                    <p className="text-[10px] text-center font-bold text-slate-400 mt-10">Ketik di sini untuk meminta perbaikan spesifik tanpa mengubah Matriks Formal.</p>
                  ) : (
                    chats.map((chat: any) => {
                      const isMe = chat.sender_role === 'dosen';
                      return (
                        <div key={chat.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'}`}>
                            {chat.pesan && <p className="whitespace-pre-wrap">{chat.pesan}</p>}
                            {chat.file_url && (
                              <a href={chat.file_url} target="_blank" className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${isMe ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                <FileText size={12} /> Lampiran
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                  <input ref={chatFileRef} type="file" className="hidden" onChange={(e) => setChatFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => chatFileRef.current?.click()} disabled={isAcc} className={`p-2 rounded-xl transition-all ${chatFile ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}><Paperclip size={18} /></button>
                  <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)} disabled={isAcc} placeholder={isAcc ? "Sesi ditutup" : "Minta revisi lagi..."} className="flex-1 bg-slate-50 border border-slate-200 py-2.5 px-4 rounded-xl text-xs outline-none focus:border-blue-400 disabled:opacity-50" />
                  <button type="submit" disabled={isAcc || sendingChat || (!chatText.trim() && !chatFile)} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
                    {sendingChat ? <Clock size={16} className="animate-spin" /> : <Send size={16} className="-ml-0.5" />}
                  </button>
                </form>
              </div>

            </div>

            {/* ================= BAGIAN KANAN (MATRIKS & DRAFT FINAL) ================= */}
            <div className="lg:col-span-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 h-full relative">
                
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Matriks Formal</h3>
                  <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Tinjau draft utama dan jawaban formal mahasiswa</p>
                </div>

                {/* KOTAK JAWABAN MAHASISWA */}
                <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4"><FileText size={16} /> Uraian Perbaikan Mahasiswa</label>
                  {feedback?.jawaban_revisi ? <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{feedback.jawaban_revisi}</p> : <p className="text-[10px] uppercase tracking-widest text-center text-slate-400 my-6 font-black">Mahasiswa Belum Mengisi Uraian</p>}
                  
                  {feedback?.signedMhsFile && (
                    <a href={feedback.signedMhsFile} target="_blank" className="mt-5 flex items-center justify-between px-5 py-4 bg-white border border-blue-200 rounded-xl hover:border-blue-400 transition-all group shadow-sm">
                      <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Download size={16} /></div><span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Unduh Draft Skripsi Terbaru.pdf</span></div>
                    </a>
                  )}
                </div>

                {/* KOTAK DOWNLOAD WORD */}
                <div className="mb-10 p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem]">
                  <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4"><FileText size={16} /> Matriks Perbaikan Lengkap</label>
                  <button type="button" onClick={handleExportWord} className="flex items-center justify-between w-full px-5 py-4 bg-white border border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm"><FileText size={16} /></div><div className="text-left"><span className="block text-sm font-bold text-slate-800 uppercase tracking-tight">Unduh Matriks Final (.doc)</span><span className="block text-[10px] font-medium text-slate-400 mt-0.5">Dokumen Word yang sudah terisi otomatis</span></div></div>
                    <Download size={18} className="text-blue-500 group-hover:scale-110" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}