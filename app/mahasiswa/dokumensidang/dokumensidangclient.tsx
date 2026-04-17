"use client";

import React, { useRef, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { sendNotification } from "@/lib/notificationUtils";
import { 
  Check, Clock, FileText,
  AlertCircle, ShieldCheck, ArrowRight, Printer,
  X 
} from 'lucide-react';

interface SidangDocumentData {
  id?: string;
  status: string; 
  file_url?: string;
}

// ================= DAFTAR BERKAS SIDANG =================
const sidangDocsList = [
  { id: 'form_pengajuan_sidang', label: "Formulir Pengajuan Sidang Tugas Akhir", sub: "Diserahkan ke Tendik" },
  { id: 'ba_bimbingan', label: "Berita Acara Bimbingan", sub: "Download di SIAT & TTD Dosen Pembimbing" },
  { id: 'transkrip_nilai', label: "Transkrip Nilai & Nilai Seminar", sub: "Disahkan oleh Dosen Wali" },
  { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi", sub: "TTD Pembimbing & Penguji" },
  { id: 'sertifikat_toefl', label: "Sertifikat TOEFL", sub: "Skor minimal 475" },
  { id: 'bukti_pembayaran', label: "Bukti Pembayaran Registrasi Semester Terakhir", sub: "Cetak dari SIAT Unpad" },
  { id: 'bebas_perpus', label: "Surat Bebas Pinjaman Perpustakaan", sub: "Universitas & Fakultas" },
  { id: 'bukti_pengajuan_lengkap', label: "Bukti Pengajuan Topik, SUP, Seminar, Sidang", sub: "Dokumen Rekapitulasi" },
  { id: 'jurnal_skripsi', label: "Print Out Jurnal Skripsi", sub: "Maksimal 10 Halaman" },
  { id: 'sertifikat_publikasi', label: "Sertifikat Publikasi / Jurnal", sub: "Bukti Penerimaan/Publikasi" },
  { id: 'skpi_materai', label: "Surat Keterangan SKPI", sub: "Dilengkapi Materai 10.000" },
  { id: 'biodata_sidang', label: "Biodata Sidang & Berkas Pendukung", sub: "Materai 10rb, FC Ijazah SMA & Akte Kelahiran" },
  { id: 'foto_sidang', label: "Pas Foto Hitam Putih (Cerah)", sub: "Kertas Dop 3x4 (6 Buah)" },
  { id: 'surat_ijazah', label: "Surat Pengantar Pengambilan Ijazah", sub: "Untuk pasca revisi skripsi" },
  { id: 'print_skripsi', label: "Print Out Skripsi (Belum Dijilid)", sub: "3 Buah Draft Fisik" },
  { id: 'flyer_sidang', label: "Flyer Skripsi", sub: "Ukuran A3 (1 Buah)" },
  { id: 'file_skripsi_final', label: "File Skripsi Final", sub: "Format PDF (Wajib Upload)", isSystem: true }, 
];

const totalDocs = sidangDocsList.length;

// ================= FETCHER SWR =================
const fetchPemberkasanSidang = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Ambil Proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!proposal) return null;

  // 2. Fetch parallel data terkait
  const [
    { data: request },
    { data: docs }
  ] = await Promise.all([
    supabase.from('seminar_requests')
      .select('id')
      .eq('proposal_id', proposal.id)
      .eq('tipe', 'seminar')
      .in('status', ['Selesai', 'Revisi', 'Disetujui'])
      .maybeSingle(),
      
    supabase.from('sidang_documents_verification')
      .select('*')
      .eq('proposal_id', proposal.id)
  ]);

  let allAcc = false;
  let seminarId = null;

  // 🔥 PERBAIKAN LOGIKA ACC GANDA (PENGUJI + PEMBIMBING) 🔥
  if (request) {
    seminarId = request.id;
    
    // Ambil dosen penguji, pembimbing, dan feedback
    const [
      { data: pengujiData },
      { data: pembimbingData },
      { data: feedbackData }
    ] = await Promise.all([
      supabase.from('examiners').select('dosen_id').eq('seminar_request_id', request.id),
      supabase.from('thesis_supervisors').select('dosen_id').eq('proposal_id', proposal.id),
      supabase.from('seminar_feedbacks').select('dosen_id, status_revisi').eq('seminar_request_id', request.id)
    ]);

    // Gabungkan list semua dosen penguji dan pembimbing (buang duplikat pakai Set)
    const allDosenIds = new Set([
      ...(pengujiData?.map(p => p.dosen_id) || []),
      ...(pembimbingData?.map(p => p.dosen_id) || [])
    ]);

    // Pastikan ada dosen yang terdaftar
    if (allDosenIds.size > 0 && feedbackData) {
      // Hitung berapa banyak dosen unik yang sudah kasih ACC
      const accCount = feedbackData.filter(fb => 
        allDosenIds.has(fb.dosen_id) && fb.status_revisi === 'diterima'
      ).length;
      
      // True jika jumlah ACC sama dengan total dosen unik
      allAcc = accCount === allDosenIds.size;
    }
  }

  const documentsMap: { [key: string]: SidangDocumentData } = {};
  if (docs) {
    docs.forEach(d => documentsMap[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
  }

  return {
    proposalId: proposal.id,
    seminarId,
    isEligible: allAcc,
    documentsMap,
    userId: user.id
  };
};

export default function DokumenSidangMahasiswa() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('dokumen_sidang_mhs', fetchPemberkasanSidang, {
    revalidateOnFocus: true,
    refreshInterval: 30000 
  });

  const proposalId = data?.proposalId || null;
  const seminarId = data?.seminarId || null;
  const isEligible = data?.isEligible || false;
  const documents = data?.documentsMap || {};

  const handleUploadFile = async (file: File) => {
    if (!proposalId) return;
    try {
      setUploading(true);
      const userId = data?.userId;
      if (!userId) return;

      const filePath = `${userId}/file_skripsi_final_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('docseminar').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('sidang_documents_verification').upsert({
        proposal_id: proposalId,
        nama_dokumen: 'file_skripsi_final',
        status: 'Menunggu Verifikasi',
        file_url: filePath
      }, { onConflict: 'proposal_id,nama_dokumen' });

      if (dbError) throw dbError;
      
      mutate(); 
      alert("Skripsi Final berhasil diunggah. Mohon tunggu verifikasi Tendik.");
    } catch (err: any) { 
      alert("Gagal mengunggah: " + err.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!window.confirm("Hapus file skripsi dan unggah ulang?")) return;
    try {
      setUploading(true);
      await supabase.storage.from('docseminar').remove([path]);
      await supabase.from('sidang_documents_verification').delete().match({ proposal_id: proposalId, nama_dokumen: 'file_skripsi_final' });
      mutate(); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleAjukanJadwal = async () => {
    if (percentage < 100 || !seminarId || !proposalId) return;
    if (!window.confirm("Seluruh berkas Anda telah diverifikasi oleh Tendik. Lanjutkan pengajuan jadwal Sidang Skripsi ke Kaprodi?")) return;
    
    try {
      setUploading(true);
      const { error: insertError } = await supabase.from("sidang_requests").insert({
        proposal_id: proposalId,
        seminar_request_id: seminarId,
        status: "menunggu_penjadwalan",
      });

      if (insertError) {
        if (insertError.code === "23505") return alert("Pengajuan Sidang Anda sudah pernah dikirim sebelumnya.");
        throw insertError;
      }

      const { data: profile } = await supabase.from('profiles').select('nama').eq('id', data?.userId).single();
      const mhsName = profile?.nama || "Seorang Mahasiswa";

      const { data: kaprodi } = await supabase.from('profiles').select('id').eq('role', 'kaprodi').maybeSingle();
      if (kaprodi) {
        await sendNotification(kaprodi.id, "Pengajuan Sidang Baru", `Mahasiswa atas nama ${mhsName} telah menyelesaikan pemberkasan sidang dan siap dijadwalkan.`);
      }

      alert("✅ Berhasil! Pengajuan Sidang Skripsi telah diteruskan ke Kaprodi.");
      router.push('/mahasiswa/dashboard'); 
    } catch (err: any) {
      alert("Gagal mengajukan sidang: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const verifiedCount = sidangDocsList.filter(d => documents[d.id]?.status === 'Lengkap').length;
  const percentage = Math.round((verifiedCount / totalDocs) * 100);

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans text-slate-700 overflow-hidden">
      <main className="flex-1  flex flex-col h-full overflow-hidden bg-[#F8F9FB]">

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto w-full">
            <div className="mb-10">
               <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pemberkasan Sidang</h1>
               <p className="text-slate-500 font-medium mt-2">Daftar ceklis dokumen fisik yang harus diserahkan ke Tendik untuk keperluan Sidang Skripsi.</p>
            </div>

            {isLoading && !data ? (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 animate-pulse">
                  <div className="lg:col-span-7 bg-slate-200 rounded-[2.5rem] h-[200px]"></div>
                  <div className="lg:col-span-5 bg-slate-200 rounded-[2.5rem] h-[200px]"></div>
                  <div className="lg:col-span-12 bg-slate-200 rounded-[3rem] h-[500px]"></div>
               </div>
            ) : error ? (
               <div className="p-10 text-center font-black text-red-500 uppercase tracking-widest bg-white rounded-[2.5rem] shadow-xl">Gagal memuat data.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                  <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex items-center gap-10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-blue-50/50 group-hover:scale-110 transition-transform duration-700"><Printer size={180} /></div>
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * percentage) / 100} className="text-blue-600 transition-all duration-1000" strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-2xl font-black text-slate-800">{percentage}%</span>
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-slate-800 mb-1">Verifikasi Tendik</h2>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{verifiedCount} dari {totalDocs} Dokumen Tervalidasi</p>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className={`h-full rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col justify-between ${isEligible ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100 border-emerald-400' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-4"><h3 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2">{isEligible ? <ShieldCheck size={20} /> : <AlertCircle size={18} />} STATUS REVISI SEMINAR</h3></div>
                        <div className={`p-5 rounded-2xl font-bold tracking-tight text-xs leading-relaxed ${isEligible ? 'bg-emerald-600 text-emerald-50' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                          ACC DARI DEWAN PENGUJI: <br/> 
                          <span className={isEligible ? "text-white text-base" : "text-red-400 text-base"}>{isEligible ? 'SELESAI (100%)' : 'BELUM LENGKAP'}</span>
                        </div>
                        {!isEligible && <p className="text-[9px] font-bold uppercase mt-3 tracking-widest opacity-60 italic">*Selesaikan perbaikan pasca seminar terlebih dahulu.</p>}
                    </div>
                  </div>
                </div>

                <div className={`bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-500 ${!isEligible ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/30 gap-4">
                      <h3 className="font-black uppercase tracking-tighter text-slate-800 text-sm">Daftar Serah Terima Berkas</h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <AlertCircle size={14} className="text-amber-500"/> Khusus Skripsi Final wajib upload di sistem
                      </div>
                  </div>
                  
                  <div className="p-8 space-y-4">
                    {sidangDocsList.map((doc, index) => {
                      const documentStatus = documents[doc.id];
                      const status = documentStatus?.status || 'Belum Diserahkan';
                      const isComplete = status === 'Lengkap';
                      const isPending = status === 'Menunggu Verifikasi';
                      
                      return (
                        <div key={doc.id} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-300 ${isComplete ? 'bg-emerald-50/40 border-emerald-100' : isPending ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm ${isComplete ? 'bg-emerald-500 text-white' : isPending ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {isComplete ? <Check size={20} strokeWidth={4} /> : isPending ? <Clock size={20} /> : index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1.5">{doc.label}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest">{doc.sub}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {doc.isSystem && (
                              <div className="flex items-center gap-2">
                                {!documentStatus?.file_url ? (
                                  <>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])} />
                                    <button 
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={uploading}
                                      className="px-6 py-2.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all shadow-md"
                                    >
                                      {uploading ? 'PROSES...' : 'UNGGAH PDF'}
                                    </button>
                                  </>
                                ) : (
                                  !isComplete && (
                                    <button onClick={() => handleDeleteFile(documentStatus.file_url!)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16} /></button>
                                  )
                                )}
                              </div>
                            )}

                            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                              isComplete ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 
                              isPending ? 'bg-blue-100 border-blue-200 text-blue-700' : 
                              'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              {isComplete ? 'Telah Diverifikasi' : isPending ? 'Menunggu Verifikasi' : 'Belum Diserahkan'}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="mt-8 p-6 bg-blue-900 rounded-[2rem] text-white flex items-center gap-6 shadow-xl shadow-blue-100">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0"><FileText size={24} className="text-blue-200" /></div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black tracking-tight">Pengiriman Soft File Tambahan</h4>
                        <p className="text-xs text-blue-100/70 font-medium leading-relaxed mt-1"><b>File Flyer Sidang</b> wajib dikirim via email ke <span className="text-white font-bold underline">informatika@unpad.ac.id</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                    <button
                      disabled={percentage < 100 || uploading}
                      onClick={handleAjukanJadwal}
                      className={`px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 ${percentage === 100 ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {uploading ? 'MEMPROSES...' : percentage === 100 ? 'Ajukan Jadwal Sidang' : 'Pemberkasan Belum Selesai'}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}