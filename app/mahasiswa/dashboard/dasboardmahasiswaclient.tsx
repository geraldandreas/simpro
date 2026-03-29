"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation";
import Image from "next/image"; 
import useSWR from 'swr';

import { 
  Check, X, Clock, 
  ShieldCheck, AlertCircle, ChevronRight, User, Lock, Megaphone, CheckCircle2
} from 'lucide-react';

// ================= TYPES =================
interface DocumentData {
  id?: string;
  status: string;
  file_url?: string;
}

type Supervisor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string | null; 
  role: 'Pembimbing Utama' | 'Co-Pembimbing';
};

// ================= FETCHER FUNCTION UNTUK SWR =================
const fetcher = async () => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("User not authenticated");
  const userId = auth.user.id;

  const { data: banners } = await supabase
    .from("broadcasts")
    .select("judul, konten")
    .eq("is_active", true)
    .in("target_audiens", ["Semua (Dosen & Mahasiswa)", "Mahasiswa Saja"])
    .order('created_at', { ascending: false });

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!proposal) return { proposal: null, banners: banners || [] };

  const [
    { data: seminarReq },
    { data: sidangReq }, 
    { data: docs },
    { data: sessions },
    { data: supervisorData }
  ] = await Promise.all([
    supabase.from('seminar_requests').select('*').eq('proposal_id', proposal.id).maybeSingle(),
    supabase.from('sidang_requests').select('status').eq('proposal_id', proposal.id).maybeSingle(),
    supabase.from('seminar_documents').select('*').eq('proposal_id', proposal.id),
    supabase.from('guidance_sessions').select('dosen_id, session_feedbacks(status_revisi)').eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir'),
    supabase.from('thesis_supervisors').select('role, dosen_id, profiles!dosen_id (id, nama, email, phone, avatar_url)').eq('proposal_id', proposal.id)
  ]);

  let isAllRevisiAcc = false;
  if (seminarReq?.status === 'Selesai') {
    const [ { data: exms }, { data: fbs } ] = await Promise.all([
      supabase.from('examiners').select('dosen_id').eq('seminar_request_id', seminarReq.id),
      supabase.from('seminar_feedbacks').select('status_revisi').eq('seminar_request_id', seminarReq.id)
    ]);
    
    const totalDosen = (exms?.length || 0) + (supervisorData?.length || 0);
    const totalAcc = fbs?.filter((f: any) => f.status_revisi === 'diterima').length || 0;
    
    if (totalDosen > 0 && totalAcc >= totalDosen) {
      isAllRevisiAcc = true;
    }
  }

  return {
    proposal,
    banners: banners || [],
    seminarReq,
    sidangReq,
    docs,
    sessions,
    supervisorData,
    isAllRevisiAcc 
  };
};

// ================= COMPONENT =================
const DashboardMahasiswa: React.FC = () => {
  const router = useRouter(); 

  const { data, error, isLoading } = useSWR('dashboard_mahasiswa', fetcher, {
    revalidateOnFocus: true, 
    refreshInterval: 60000   
  });

  if (error) return <div className="h-screen flex items-center justify-center font-black text-red-500 uppercase tracking-widest">Gagal memuat data.</div>;

  // ================= HITUNG LOGIKA BERDASARKAN DATA SWR =================
  let activeStep = 0;
  let isEligible = false;
  let bimbinganCount = { p1: 0, p2: 0 };
  let isAccDosen = false;
  let stats = { bimbingan: 0, revisi: "Tidak Ada", docs: 0 };
  let documentsMap: { [key: string]: DocumentData } = {};
  let supervisors: Supervisor[] = [];

  const activeBanners = data?.banners || [];
  const prop = data?.proposal;

  if (prop) {
    const uploadedDocsCount = data?.docs?.length || 0;
    const verifiedDocsCount = data?.docs?.filter(d => d.status === 'Lengkap').length || 0;
    
    let p1Count = 0, p2Count = 0;
    data?.supervisorData?.forEach((sp: any) => {
      const count = data?.sessions?.filter(s => s.dosen_id === sp.profiles.id && s.session_feedbacks?.[0]?.status_revisi !== 'revisi').length || 0;
      if (sp.role === 'utama' || sp.role === 'pembimbing1') p1Count = count;
      else p2Count = count;
    });

    const approvedByAll = data?.seminarReq?.approved_by_p1 && data?.seminarReq?.approved_by_p2;
    const eligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

    if (prop.status === "Lulus") {
      activeStep = 9; 
      isEligible = true;
    } else if (prop.status === "Menunggu Persetujuan Dosbing") {
      activeStep = 1;
    } else if (prop.status === "Diterima") {
      activeStep = 2; 
      if (eligible) {
        activeStep = 3; 
        if (uploadedDocsCount > 0) activeStep = 4; 
        if (uploadedDocsCount >= 3) activeStep = 5; 
        if (verifiedDocsCount >= 3) activeStep = 6; 
        
        if (data?.seminarReq?.status === "Selesai") {
          activeStep = 7; 
          if (data.isAllRevisiAcc) activeStep = 8; 
        }

        if (data?.sidangReq) {
          activeStep = 8; 
          if (data.sidangReq.status === "Lulus" || data.sidangReq.status === "Selesai") {
            activeStep = 9; 
          }
        }
      }
    }

    isEligible = activeStep === 9 ? true : !!eligible;
    bimbinganCount = { p1: p1Count, p2: p2Count };
    isAccDosen = !!approvedByAll;

    if (data?.docs) {
      data.docs.forEach(d => documentsMap[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
      stats = { bimbingan: p1Count + p2Count, revisi: "Tidak Ada", docs: verifiedDocsCount };
    }

    if (data?.supervisorData) {
      supervisors = data.supervisorData.map((s: any) => ({
        id: s.profiles.id,
        name: s.profiles.nama,
        email: s.profiles.email,
        phone: s.profiles.phone,
        avatar_url: s.profiles.avatar_url || null,
        role: s.role === 'utama' || s.role === 'pembimbing1' ? 'Pembimbing Utama' : 'Co-Pembimbing',
      }));
    }
  }

  const getDocStatus = (docId: string) => {
    const doc = documentsMap[docId];
    if (!doc) return 'fail';
    if (doc.status === 'Lengkap') return 'success';
    if (doc.status === 'Menunggu Verifikasi') return 'wait';
    return 'fail';
  };

  const docPercentage = Math.round((stats.docs / 4) * 100);
  
  const totalSteps = 10; 
  const stepWidth = 100 / (totalSteps - 1);
  const greenWidth = activeStep >= 2 ? (activeStep - 1) * stepWidth : activeStep * stepWidth;
  const blueWidth = activeStep >= 2 ? stepWidth : 0;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans text-slate-700">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6"></div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-6">
              <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                Simpro
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">

            {isLoading && !data ? (
               <div className="animate-pulse space-y-10">
                 <div className="h-24 bg-slate-200 rounded-3xl w-full"></div>
                 <div className="h-40 bg-slate-200 rounded-[2.5rem] w-full"></div>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   <div className="h-80 bg-slate-200 rounded-[2.5rem] lg:col-span-4"></div>
                   <div className="h-80 bg-slate-200 rounded-[2.5rem] lg:col-span-4"></div>
                 </div>
               </div>
            ) : (
              <>
                {/* BANNER PENGUMUMAN */}
                {activeBanners.length > 0 && (
                  <div className="mb-8 space-y-4">
                    {activeBanners.map((banner, idx) => {
                      const scrollText = `Pengumuman: ${banner.judul} - ${banner.konten}`;
                      return (
                        <div key={idx} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-5 shadow-md relative overflow-hidden group animate-in slide-in-from-top-4 duration-500">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-300 z-10">
                            <Megaphone size={20} className="text-white animate-pulse" />
                          </div>
                          <div className="flex-1 overflow-hidden relative">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Pengumuman Terbaru</p>
                            <div className="animate-marquee whitespace-nowrap text-sm font-bold text-slate-700 flex">
                              <span>{scrollText}</span><span className="ml-16">{scrollText}</span><span className="ml-16">{scrollText}</span>
                            </div>
                          </div>
                          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BANNER BUKA PINTU SIDANG */}
                {data?.isAllRevisiAcc && !data?.sidangReq && activeStep !== 9 && (
                  <div className="mb-8 bg-emerald-500 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-emerald-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-1">Pintu Sidang Terbuka!</h3>
                        <p className="text-emerald-100 text-sm font-medium leading-relaxed">
                          Selamat! Seluruh Dosen telah memberikan ACC perbaikan. Anda sekarang dapat mengunggah syarat pendaftaran Sidang Skripsi Akhir.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push('/mahasiswa/dokumensidang')}
                      className="shrink-0 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95"
                    >
                      Daftar Sidang Akhir <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* BANNER KELULUSAN */}
                {activeStep === 9 && (
                  <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl shadow-blue-300/50 animate-in zoom-in duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                        <ShieldCheck size={32} className="text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-1 text-white">Selamat, Anda Lulus! 🎉</h3>
                        <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-xl">
                          Skripsi Anda telah disahkan oleh Kaprodi dan Anda resmi dinyatakan Lulus. Semua perjuangan Anda terbayar lunas. Sukses untuk langkah selanjutnya!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PERINGATAN SYARAT (Kunci Seminar) */}
                {!isEligible && activeStep !== 9 && (
                  <div className="mb-8 bg-white border-l-4 border-orange-500 rounded-3xl shadow-lg p-6 flex items-start gap-5 animate-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Lock size={24} /></div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tahap Seminar Terkunci</h3>
                      <p className="text-sm text-slate-500 mt-1">Selesaikan minimal 10x bimbingan P1 & P2 serta persetujuan dosen untuk membuka akses.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <StatusBadge label="P1" current={bimbinganCount.p1} target={10} />
                        <StatusBadge label="P2" current={bimbinganCount.p2} target={10} />
                        <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isAccDosen ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                          ACC Dosen: {isAccDosen ? 'Sudah' : 'Belum'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <header className="mb-10">
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Mahasiswa</h1>
                  <p className="text-slate-500 font-medium mt-1">Pantau progres pengerjaan skripsi Anda secara real-time.</p>
                </header>

                <section className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white mb-10 overflow-hidden relative">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Linimasa Skripsi</h3>
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100 tracking-widest">
                      Tahap Saat Ini :  {activeStep + 1}
                    </span>
                  </div>
                  <div className="relative pt-4 pb-8">
                    <div className="absolute top-[38px] left-6 w-full h-1.5 bg-slate-100 rounded-full z-0" />
                    <div className="absolute top-[38px] left-6 h-1.5 bg-green-600 rounded-full z-0 transition-all duration-700" style={{ width: `${greenWidth}%` }} />
                    {blueWidth > 0 && <div className="absolute top-[38px] h-1.5 bg-blue-600 rounded-full z-0 transition-all duration-700" style={{ left: `calc(${greenWidth}% + 1.5rem)`, width: `${blueWidth}%` }} />}
                    <div className="relative flex justify-between">
                      {["Pengajuan Judul", "Persetujuan Dosbing", "Bimbingan", "Kesiapan Seminar", "Unggah Dokumen Seminar", "Verifikasi Berkas", "Seminar", "Perbaikan Seminar", "Sidang", "Lulus"].map((l, i) => (
                        <TimelineStep key={l} label={l} index={i} current={activeStep === i} completed={activeStep > i} />
                      ))}
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  <div className={`lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col items-center transition-all ${!isEligible && activeStep !== 9 ? 'opacity-75' : ''}`}>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 w-full flex justify-between">
                      Kelengkapan Dokumen {(!isEligible && activeStep !== 9) && <Lock size={16} className="text-slate-400" />}
                    </h3>
                    
                    <div className="relative w-48 h-48 flex items-center justify-center mb-10">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                          <circle 
                            cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray="534" 
                            strokeDashoffset={isEligible ? (534 - (534 * docPercentage) / 100) : 534} 
                            className="text-blue-600 transition-all duration-1000 ease-out" strokeLinecap="round" 
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-4xl font-black text-slate-800">{isEligible ? docPercentage : 0}%</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase mt-1">Tervalidasi</span>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                      {/* 🔥 Label Dokumen sekarang huruf normal 🔥 */}
                      <DocumentItem label="Form Layak & Jadwal" status={getDocStatus('form_layak_dan_jadwal')} />
                      <DocumentItem label="Form Nilai Magang Gabungan" status={getDocStatus('nilai_magang_gabungan')} />
                      <DocumentItem label="Bukti Serah Laporan Magang" status={getDocStatus('bukti_serah_magang')} />
                      <button 
                        disabled={!isEligible} 
                        onClick={() => router.push('/mahasiswa/uploaddokumen')} 
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-6 transition-all ${isEligible ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      >
                        Detail Dokumen <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Ringkasan Status</h3>
                    <div className="space-y-4">
                      <SummaryRow icon={<ShieldCheck size={18} />} label="P1 (Utama)" value={`${bimbinganCount.p1} / 10`} status={bimbinganCount.p1 >= 10} />
                      <SummaryRow icon={<ShieldCheck size={18} />} label="P2 (Co-Dosbing)" value={`${bimbinganCount.p2} / 10`} status={bimbinganCount.p2 >= 10} />
                      <SummaryRow icon={<ShieldCheck size={18} />} label="ACC Dosbing" value={isAccDosen ? 'Valid' : 'Pending'} status={isAccDosen} />
                    </div>
                    <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ">Info Penting</p>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">Lengkapi minimal 10x bimbingan dengan Pembimbing Utama dan Pendamping sebelum mengajukan seminar hasil.</p>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    {supervisors.map(sp => (
                      <ContactCard key={sp.id} name={sp.name} role={sp.role} email={sp.email} phone={sp.phone} avatar_url={sp.avatar_url} />
                    ))}

                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden shadow-lg">
                      <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-4">Administrasi</p>
                      <p className="text-sm font-bold">Bapak Anton</p>
                      <p className="text-[10px] opacity-70">Tenaga Kependidikan Prodi</p>
                      <User className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24" />
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardMahasiswa;

// --- HELPER COMPONENTS ---

// 🔥 Dihilangkan class 'uppercase', size dinaikkan sedikit agar bisa dibaca
const TimelineStep = ({ label, index, current, completed }: any) => (
  <div className="flex flex-col items-center w-16 relative z-10">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg transition-all duration-500 ${completed ? 'bg-green-500 text-white' : current ? 'bg-blue-600 text-white scale-110 shadow-blue-200' : 'bg-slate-100 text-slate-300'}`}>
      {completed ? <Check size={20} strokeWidth={4} /> : <span className="text-xs font-black">{index + 1}</span>}
    </div>
    <span className={`mt-3 text-[10px] font-bold text-center tracking-tight ${current ? 'text-slate-800' : 'text-slate-400'}`}>
      {label}
    </span>
  </div>
);

// 🔥 Dihilangkan class 'uppercase', text size diubah ke text-xs
const DocumentItem = ({ label, status }: any) => (
  <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-200 transition-all">
    <span className="text-xs font-bold text-slate-600 truncate mr-4 tracking-tight">{label}</span>
    {status === 'success' ? (
      <div className="p-1 bg-green-100 text-green-600 rounded-lg"><Check size={12} strokeWidth={4} /></div>
    ) : status === 'wait' ? (
      <div className="p-1 bg-amber-100 text-amber-500 rounded-lg"><Clock size={12} strokeWidth={4} /></div>
    ) : (
      <div className="p-1 bg-red-100 text-red-500 rounded-lg"><X size={12} strokeWidth={4} /></div>
    )}
  </div>
);

const SummaryRow = ({ icon, label, value, status }: any) => (
  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-white shadow-sm ${status ? 'text-green-500' : 'text-slate-400'}`}>{icon}</div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-xs font-black ${status ? 'text-green-600' : 'text-slate-800'}`}>{value}</span>
  </div>
);

const StatusBadge = ({ label, current, target }: any) => (
  <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${current >= target ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
    {label}: {current}/{target} {current >= target && <Check size={12} />}
  </div>
);

const ContactCard = ({ name, role, email, phone, avatar_url }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-center gap-4">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 relative overflow-hidden shrink-0 border border-slate-200">
      {avatar_url ? (
        <Image src={avatar_url} alt={name} layout="fill" objectFit="cover" />
      ) : (
        <User size={24} />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-black text-slate-800 truncate">{name}</p>
      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1.5">{role}</p>
      {email && <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5"><span className="opacity-60">✉️</span> {email}</p>}
      {phone && <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5"><span className="opacity-60">📞</span> {phone}</p>}
    </div>
  </div>
);