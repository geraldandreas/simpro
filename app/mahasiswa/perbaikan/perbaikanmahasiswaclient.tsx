"use client";

import React from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/sidebar';
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, Clock, 
  ChevronRight, 
  User, MessageSquare, AlertCircle,
  UserCheck, Download, FileText
} from 'lucide-react';

interface ExaminerRevisi {
  dosen_id: string;
  role: string;
  nama_dosen: string;
  avatar_url: string | null;
  status_revisi: string; 
  ttd_url: string | null;
  catatan_revisi: string;
  jawaban_revisi: string;
}

// ================= FETCHER SWR =================
const fetchRevisiData = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // 1. Ambil Proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`id, judul, user:profiles(nama, npm)`)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!proposal) return null;

  // 2. Ambil Data Seminar
  const { data: request } = await supabase.from('seminar_requests')
    .select('id')
    .eq('proposal_id', proposal.id)
    .eq('tipe', 'seminar')
    .in('status', ['Selesai', 'Revisi', 'Disetujui']) 
    .maybeSingle();
  
  if (!request) {
    return { proposalData: proposal, seminarId: null, examiners: [], allAcc: false, schedule: null }; 
  }

  // 3. Fetch Penguji, Pembimbing, Feedback, dan Jadwal
  const [
    { data: pengujiData },
    { data: pembimbingData },
    { data: feedbackData },
    { data: scheduleData }
  ] = await Promise.all([
    supabase.from('examiners').select(`dosen_id, role, dosen:profiles!examiners_dosen_id_fkey(nama, avatar_url, ttd_url)`).eq('seminar_request_id', request.id),
    supabase.from('thesis_supervisors').select(`dosen_id, role, dosen:profiles(nama, avatar_url, ttd_url)`).eq('proposal_id', proposal.id),
    supabase.from('seminar_feedbacks').select('dosen_id, status_revisi, catatan_revisi, jawaban_revisi').eq('seminar_request_id', request.id),
    supabase.from('seminar_schedules').select('tanggal').eq('seminar_request_id', request.id).maybeSingle()
  ]);

  let mappedExaminers: ExaminerRevisi[] = [];
  let isAllAcc = false;

  // Gabungkan Penguji dan Pembimbing ke dalam satu array untuk dirender dan diekspor
  const allDosenList = [...(pengujiData || []), ...(pembimbingData || [])];

  if (allDosenList.length > 0) {
    mappedExaminers = allDosenList.map((p: any) => {
      const fb = feedbackData?.find(f => f.dosen_id === p.dosen_id);
      const dosenInfo = Array.isArray(p.dosen) ? p.dosen[0] : p.dosen;
      
      return {
        dosen_id: p.dosen_id,
        role: p.role,
        nama_dosen: dosenInfo?.nama || "Dosen",
        avatar_url: dosenInfo?.avatar_url || null,
        ttd_url: dosenInfo?.ttd_url || null, 
        status_revisi: fb?.status_revisi || 'menunggu',
        catatan_revisi: fb?.catatan_revisi || '',
        jawaban_revisi: fb?.jawaban_revisi || '',
      };
    });

    // Urutkan untuk tampilan UI
    const roleOrder: Record<string, number> = { 'utama': 1, 'pembimbing1': 1, 'pendamping': 2, 'pembimbing2': 2, 'penguji1': 3, 'penguji2': 4, 'penguji3': 5 };
    mappedExaminers.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));
    
    // Cek apakah SEMUA Dosen (yang ada di tabel) sudah ACC
    isAllAcc = mappedExaminers.length > 0 && mappedExaminers.every(e => e.status_revisi === 'diterima');
  }

  return {
    proposalData: proposal,
    seminarId: request.id,
    examiners: mappedExaminers,
    allAcc: isAllAcc,
    schedule: scheduleData?.tanggal || ".................................................................."
  };
};

export default function PerbaikanMahasiswaClient() {
  const router = useRouter();

  const { data, error, isLoading } = useSWR('revisi_mahasiswa_data_full', fetchRevisiData, {
    revalidateOnFocus: true,
    refreshInterval: 30000 
  });

  const proposalData = data?.proposalData;
  const seminarId = data?.seminarId || null;
  const examiners = data?.examiners || [];
  const allAcc = data?.allAcc || false;
  const scheduleDate = data?.schedule;

  const formatRole = (role: string) => {
    if (role === 'penguji1') return "Penguji Utama";
    if (role === 'penguji2') return "Anggota Penguji 1";
    if (role === 'penguji3') return "Anggota Penguji 2";
    if (role === 'utama' || role === 'pembimbing1') return "Pembimbing Utama";
    if (role === 'pendamping' || role === 'pembimbing2') return "Pembimbing Pendamping";
    return "Penguji";
  };

  // ================= FUNGSI EXPORT FULL MATRIKS (ALL DOSEN) =================
  const handleExportFullMatriks = () => {
    if (!proposalData || examiners.length === 0) return;

    const mhsName = Array.isArray(proposalData.user) ? proposalData.user[0]?.nama : (proposalData.user as any)?.nama;
    const mhsNpm = Array.isArray(proposalData.user) ? proposalData.user[0]?.npm : (proposalData.user as any)?.npm;

    const formattedDate = scheduleDate?.includes("-") 
      ? new Date(scheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : scheduleDate;

    const formatText = (text: string) => {
      if (!text) return "<br><br><br>";
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) return "<br><br><br>";
      return lines.map((line, idx) => `${String.fromCharCode(65 + idx)}. ${line}`).join('<br><br>');
    };

    const getDosenByRole = (roleKeys: string[]) => {
       return examiners.find(e => roleKeys.includes(e.role));
    };

    const d_p1 = getDosenByRole(['utama', 'pembimbing1']);
    const d_p2 = getDosenByRole(['pendamping', 'pembimbing2']);
    const d_u1 = getDosenByRole(['penguji1']);
    const d_u2 = getDosenByRole(['penguji2']);
    const d_u3 = getDosenByRole(['penguji3']);

    // 🔥 UKURAN PRESISI 2.6cm x 2.51cm 🔥
    const generateRow = (no: number, labelTitle: string, dosenData: ExaminerRevisi | undefined) => {
      if (!dosenData) {
        return `<tr><td style="border: 1px solid black; padding: 8px; text-align: center;">${no}.</td><td style="border: 1px solid black; padding: 8px;">${labelTitle}</td><td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td></tr>`;
      }
      
      // Memaksa ukuran MS Word ke CM
      const ttdHtml = dosenData.ttd_url 
        ? `<div style="text-align: center;">
             <img src="${dosenData.ttd_url}" width="98" height="95" style="width: 2.6cm; height: 2.51cm;" alt="TTD" />
           </div>` 
        : "";

      return `
      <tr>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: center;">${no}.</td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top;">
              ${labelTitle}<br/>
              <strong>${dosenData.nama_dosen}</strong><br/><br/>
              ${formatText(dosenData.catatan_revisi)}
          </td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top;">
              <br/><br/>
              ${formatText(dosenData.jawaban_revisi)}
          </td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: middle; text-align: center; width: 15%;">
              ${ttdHtml}
          </td>
      </tr>
      `;
    };

    const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Matriks Perbaikan Lengkap</title></head>
    <body>
      <div style="text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; line-height: 1.5; font-size: 14pt;">
        MATRIKS PERBAIKAN SKRIPSI<br>
        PROGRAM STUDI TEKNIK INFORMATIKA<br>
        FAKULTAS MATEMATIKA DAN ILMU PENGETAHUAN ALAM<br>
        UNIVERSITAS PADJADJARAN
      </div>
      <br><br>
      <table style="font-family: 'Times New Roman', Times, serif; border: none; width: 100%; font-size: 12pt;">
        <tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>${mhsName || '..................................................................'}</td></tr>
        <tr><td>NPM</td><td>:</td><td>${mhsNpm || '..................................................................'}</td></tr>
        <tr><td>Tanggal Sidang</td><td>:</td><td>${formattedDate}</td></tr>
        <tr><td>Judul Skripsi</td><td>:</td><td>${proposalData.judul || '..................................................................'}</td></tr>
        <tr><td>Pembimbing 1</td><td>:</td><td>${d_p1?.nama_dosen || '..................................................................'}</td></tr>
        <tr><td>Pembimbing 2</td><td>:</td><td>${d_p2?.nama_dosen || '..................................................................'}</td></tr>
        <tr><td>Penguji 1</td><td>:</td><td>${d_u1?.nama_dosen || '..................................................................'}</td></tr>
        <tr><td>Penguji 2</td><td>:</td><td>${d_u2?.nama_dosen || '..................................................................'}</td></tr>
        <tr><td>Penguji 3</td><td>:</td><td>${d_u3?.nama_dosen || '..................................................................'}</td></tr>
      </table>
      <br><br>
      <table style="font-family: 'Times New Roman', Times, serif; border-collapse: collapse; width: 100%; border: 1px solid black; font-size: 12pt;">
        <thead>
          <tr>
            <th style="border: 1px solid black; padding: 8px; width: 5%;">No</th>
            <th style="border: 1px solid black; padding: 8px; width: 45%;">Uraian masukan pembimbing dan penguji (No Halaman)</th>
            <th style="border: 1px solid black; padding: 8px; width: 35%;">Uraian Perbaikan yang sudah dilakukan (No Halaman)</th>
            <th style="border: 1px solid black; padding: 8px; width: 15%;">TTD</th>
          </tr>
        </thead>
        <tbody>
          ${generateRow(1, 'Pembimbing 1', d_p1)}
          ${generateRow(2, 'Pembimbing 2', d_p2)}
          ${generateRow(3, 'Penguji 1', d_u1)}
          ${generateRow(4, 'Penguji 2', d_u2)}
          ${generateRow(5, 'Penguji 3', d_u3)}
        </tbody>
      </table>
    </body></html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matriks_Perbaikan_FULL_${mhsName?.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-full overflow-y-auto custom-scrollbar">
        
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6"></div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">Simpro</span>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Perbaikan Pasca Seminar</h1>
            <p className="text-slate-500 font-medium mt-3 tracking-normal normal-case font-serif">
              Selesaikan revisi dengan Dewan Penguji untuk melangkah ke tahap Sidang Skripsi Akhir.
            </p>
          </header>

          {isLoading && !data ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 animate-pulse">
              <div className="h-12 w-12 border-4 border-slate-200 border-t-blue-400 rounded-full mb-4 animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menyinkronkan Data...</p>
            </div>
          ) : error ? (
            <div className="h-96 flex items-center justify-center font-black text-red-500 uppercase tracking-widest bg-white rounded-[2.5rem] shadow-xl">
              Gagal memuat data revisi.
            </div>
          ) : !seminarId ? (
             <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-inner">
                   <AlertCircle size={40} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Riwayat Tidak Ditemukan</h3>
                <p className="text-sm font-bold text-slate-400">Anda belum memiliki riwayat seminar yang valid untuk direvisi.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              
              {/* 🔥 BANNER DOWNLOAD MATRIKS FULL MUNCUL JIKA SEMUA ACC 🔥 */}
              {allAcc && (
                <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-emerald-200 animate-in fade-in zoom-in duration-700">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight mb-1">Revisi Selesai!</h3>
                      <p className="text-emerald-100 text-sm font-medium leading-relaxed">
                        Seluruh dosen telah memberikan ACC. Anda dapat mengunduh dokumen Matriks Perbaikan final yang sudah berisi seluruh catatan, jawaban, dan tanda tangan dosen.
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleExportFullMatriks}
                    className="shrink-0 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95"
                  >
                    <Download size={18} /> Unduh Matriks Final
                  </button>
                </div>
              )}

              {/* ================= SECTION: STATUS REVISI PENGUJI ================= */}
              <div className="bg-white p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                      <UserCheck size={24} />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Status Revisi Dosen</h2>
                  </div>
                  <span className={`px-5 py-2 text-[10px] font-black rounded-full border tracking-[0.15em] uppercase shadow-sm transition-colors duration-500 ${allAcc ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                    {examiners.filter(e => e.status_revisi === 'diterima').length} DARI {examiners.length} ACC
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {examiners.map((penguji) => {
                    const isAcc = penguji.status_revisi === 'diterima';
                    const isReview = penguji.status_revisi === 'diperiksa';
                    const isRevisi = penguji.status_revisi === 'revisi';
                    const isMenunggu = penguji.status_revisi === 'menunggu';
                    
                    return (
                      <div key={penguji.dosen_id} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 hover:border-white">
                        
                        <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border-2 overflow-hidden shadow-inner transition-colors duration-500 ${
                            isAcc ? 'border-emerald-200 bg-emerald-50 text-emerald-500' : 
                            isRevisi ? 'border-red-200 bg-red-50 text-red-500' :
                            'border-slate-200 bg-slate-100 text-slate-400'
                          }`}>
                            {penguji.avatar_url ? (
                               <img src={penguji.avatar_url} className="object-cover w-full h-full" alt="Avatar" />
                            ) : ( <User size={28} /> )}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-800 uppercase tracking-tight">{penguji.nama_dosen}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{formatRole(penguji.role)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors duration-500 ${
                            isAcc ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            isReview ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            isRevisi ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {isAcc ? <CheckCircle2 size={16} /> : 
                             isReview ? <Clock size={16} /> : 
                             isRevisi ? <AlertCircle size={16} /> : 
                             <MessageSquare size={16} />}
                             
                            {isAcc ? 'Revisi Diterima' : 
                             isReview ? 'Sedang Diperiksa' : 
                             isRevisi ? 'Perlu Diperbaiki' : 
                             'Belum Mulai'}
                          </div>
                          
                          {!isMenunggu && (
                            <button 
                              onClick={() => router.push(`/mahasiswa/revisiseminar?dosen_id=${penguji.dosen_id}`)}
                              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg flex items-center gap-2 ${
                                isAcc ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 shadow-none active:scale-95' : 
                                isRevisi ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 active:scale-95' :
                                'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 active:scale-95'
                              }`}
                            >
                              {isAcc ? 'Lihat Riwayat' : isRevisi ? 'Perbaiki Sekarang' : 'Lihat Progres'}
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}