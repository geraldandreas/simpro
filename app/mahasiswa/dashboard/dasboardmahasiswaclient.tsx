"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation";
import Image from "next/image"; // 🔥 Import Image

import { 
  FileText, Bell, Check, X, Clock, MessageSquare, 
  ShieldCheck, AlertCircle, ChevronRight, User, Lock, Megaphone
} from 'lucide-react';

const DashboardMahasiswa: React.FC = () => {
  const router = useRouter(); 
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<boolean>(true);

  interface DocumentData {
    id?: string;
    status: string;
    file_url?: string;
  }

  const [documents, setDocuments] = useState<{ [key: string]: DocumentData }>({});
  const getDocStatus = (docId: string) => {
    const doc = documents[docId];

    if (!doc) return 'fail';
    if (doc.status === 'Lengkap') return 'success';
    if (doc.status === 'Menunggu Verifikasi') return 'wait';
    return 'fail';
  };

  // State untuk Logika Gatekeeping
  const [isEligible, setIsEligible] = useState(false);
  const [bimbinganCount, setBimbinganCount] = useState({ p1: 0, p2: 0 });
  const [isAccDosen, setIsAccDosen] = useState(false);
  const [stats, setStats] = useState({ bimbingan: 0, revisi: "Tidak Ada", docs: 0 });

  // 🔥 Update tipe data Supervisor untuk menampung avatar_url
  type Supervisor = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar_url?: string | null; 
    role: 'Pembimbing Utama' | 'Co-Pembimbing';
  };

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [seminarStatus, setSeminarStatus] = useState<string | null>(null);
  const [sidangStatus, setSidangStatus] = useState<string | null>(null);

  const [activeBanners, setActiveBanners] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingStep(true);
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        const userId = auth.user.id;

        const { data: banners } = await supabase
          .from("broadcasts")
          .select("judul, konten")
          .eq("is_active", true)
          .in("target_audiens", ["Semua (Dosen & Mahasiswa)", "Mahasiswa Saja"])
          .order('created_at', { ascending: false });

        if (banners && banners.length > 0) {
           setActiveBanners(banners);
        }

        const { data: proposal } = await supabase
          .from("proposals")
          .select("id, status")
          .eq("user_id", userId)
          .maybeSingle();

        if (!proposal) {
          setActiveStep(0);
          setLoadingStep(false);
          return;
        }

        const { data: seminarReq } = await supabase.from('seminar_requests').select('*').eq('proposal_id', proposal.id).maybeSingle();
        const { data: sidangReq } = await supabase.from('sidang_requests').select('status').eq('proposal_id', proposal.id).maybeSingle();
        const { data: docs } = await supabase.from('seminar_documents').select('*').eq('proposal_id', proposal.id);
        const { data: sessions } = await supabase.from('guidance_sessions').select('dosen_id, session_feedbacks(status_revisi)').eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir');
        
        // 🔥 Tambahkan avatar_url di query ini
        const { data: supervisorData } = await supabase.from('thesis_supervisors').select('role, profiles!dosen_id (id, nama, email, phone, avatar_url)').eq('proposal_id', proposal.id);

        const uploadedDocsCount = docs?.length || 0;
        const verifiedDocsCount = docs?.filter(d => d.status === 'Lengkap').length || 0;
        
        let p1Count = 0, p2Count = 0;
        supervisorData?.forEach((sp: any) => {
          const count = sessions?.filter(s => s.dosen_id === sp.profiles.id && s.session_feedbacks?.[0]?.status_revisi !== 'revisi').length || 0;
          if (sp.role === 'utama' || sp.role === 'pembimbing1') p1Count = count;
          else p2Count = count;
        });

        const approvedByAll = seminarReq?.approved_by_p1 && seminarReq?.approved_by_p2;
        const eligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

        let currentStep = 0;

        if (proposal.status === "Menunggu Persetujuan Dosbing") {
          currentStep = 1;
        } else if (proposal.status === "Diterima") {
          currentStep = 2; 

          if (eligible) {
            currentStep = 3; 

            if (uploadedDocsCount > 0) {
              currentStep = 4; 
            }

            if (uploadedDocsCount >= 3) {
              currentStep = 5; 
            }

            if (verifiedDocsCount >= 3) {
              currentStep = 6; 
            }

            if (seminarReq?.status === "Selesai") {
              currentStep = 7; 
            }

            if (sidangReq) {
              currentStep = 8; 
            }
          }
        }

        setActiveStep(currentStep);
        setIsEligible(!!eligible);
        setBimbinganCount({ p1: p1Count, p2: p2Count });
        setIsAccDosen(!!approvedByAll);
        setSeminarStatus(seminarReq?.status || null);
        setSidangStatus(sidangReq?.status || null);
        
        if (docs) {
          const map: { [key: string]: DocumentData } = {};
          docs.forEach(d => map[d.nama_dokumen] = { id: d.id, status: d.status, file_url: d.file_url });
          setDocuments(map);
          setStats({ bimbingan: p1Count + p2Count, revisi: "Tidak Ada", docs: verifiedDocsCount });
        }

        // 🔥 Mapping data avatar dosen
        if (supervisorData) {
          setSupervisors(supervisorData.map((s: any) => ({
            id: s.profiles.id,
            name: s.profiles.nama,
            email: s.profiles.email,
            phone: s.profiles.phone,
            avatar_url: s.profiles.avatar_url || null, // Ambil avatar_url
            role: s.role === 'utama' || s.role === 'pembimbing1' ? 'Pembimbing Utama' : 'Co-Pembimbing',
          })));
        }

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoadingStep(false);
      }
    };

    loadDashboardData();
  }, []);

  const docPercentage = Math.round((stats.docs / 3) * 100);
  const totalSteps = 9;
  const stepWidth = 100 / (totalSteps - 1);
  const greenWidth = activeStep >= 2 ? (activeStep - 1) * stepWidth : activeStep * stepWidth;
  const blueWidth = activeStep >= 2 ? stepWidth : 0;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans text-slate-700">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group"></div>
          </div>
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

            {activeBanners.length > 0 && (
              <div className="mb-8 space-y-4">
                {activeBanners.map((banner, idx) => {
                  const scrollText = `PENGUMUMAN: ${banner.judul} - ${banner.konten}`;
                  return (
                    <div key={idx} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-5 shadow-md relative overflow-hidden group animate-in slide-in-from-top-4 duration-500">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-300 z-10">
                         <Megaphone size={20} className="text-white animate-pulse" />
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Pengumuman Terbaru</p>
                         <div className="animate-marquee whitespace-nowrap text-sm font-bold text-slate-700 flex">
                           <span>{scrollText}</span>
                           <span className="ml-16">{scrollText}</span>
                           <span className="ml-16">{scrollText}</span>
                         </div>
                      </div>
                      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingStep && !isEligible && (
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
                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100 uppercase tracking-widest">
                  Tahap {activeStep + 1}
                </span>
              </div>
              <div className="relative pt-4 pb-8">
                <div className="absolute top-[38px] left-6 w-full h-1.5 bg-slate-100 rounded-full z-0" />
                <div
                  className="absolute top-[38px] left-6 h-1.5 bg-green-600 rounded-full z-0 transition-all duration-700"
                  style={{ width: `${greenWidth}%` }}
                />
                {blueWidth > 0 && (
                  <div
                    className="absolute top-[38px] h-1.5 bg-blue-600 rounded-full z-0 transition-all duration-700"
                    style={{
                      left: `calc(${greenWidth}% + 1.5rem)`,
                      width: `${blueWidth}%`,
                    }}
                  />
                )}
                <div className="relative flex justify-between">
                  {["Pengajuan Judul", "Persetujuan Dosbing", "Bimbingan", "Kesiapan Seminar", "Unggah Dokumen Seminar", "Verifikasi Berkas", "Seminar", "Perbaikan Seminar", "Sidang"].map((l, i) => (
                    <TimelineStep key={l} label={l} index={i} current={activeStep === i} completed={activeStep > i} />
                  ))}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className={`lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col items-center transition-all ${!isEligible ? 'opacity-75' : ''}`}>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 w-full flex justify-between">
                  Kelengkapan Dokumen {!isEligible && <Lock size={16} className="text-slate-400" />}
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Info Penting</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">Lengkapi minimal 10x bimbingan dengan Pembimbing Utama dan Pendamping sebelum mengajukan seminar hasil.</p>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                {supervisors.map(sp => (
                  <ContactCard
                    key={sp.id}
                    name={sp.name}
                    role={sp.role}
                    email={sp.email}
                    phone={sp.phone}
                    avatar_url={sp.avatar_url} // 🔥 Kirim props avatar_url ke komponen
                  />
                ))}

                <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden shadow-lg">
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-4">Administrasi</p>
                  <p className="text-sm font-bold">Bapak Anton</p>
                  <p className="text-[10px] opacity-70">Tenaga Kependidikan Prodi</p>
                  <User className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const TimelineStep = ({ label, index, current, completed }: any) => (
  <div className="flex flex-col items-center w-16 relative z-10">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg transition-all duration-500 ${completed ? 'bg-green-500 text-white' : current ? 'bg-blue-600 text-white scale-110 shadow-blue-200' : 'bg-slate-100 text-slate-300'}`}>
      {completed ? <Check size={20} strokeWidth={4} /> : <span className="text-xs font-black">{index + 1}</span>}
    </div>
    <span className={`mt-3 text-[8px] font-black uppercase text-center tracking-tighter ${current ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
  </div>
);

const DocumentItem = ({ label, status }: any) => (
  <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-200 transition-all">
    <span className="text-[10px] font-bold text-slate-600 truncate mr-4 tracking-tight uppercase">{label}</span>
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

// 🔥 Update komponen ContactCard untuk merender avatar_url
const ContactCard = ({ name, role, email, phone, avatar_url }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-center gap-4">
    
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 relative overflow-hidden shrink-0 border border-slate-200">
      {avatar_url ? (
        <Image 
          src={avatar_url} 
          alt={name} 
          layout="fill" 
          objectFit="cover" 
        />
      ) : (
        <User size={24} />
      )}
    </div>

    <div className="min-w-0">
      <p className="text-sm font-black text-slate-800 truncate uppercase">{name}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
        {role}
      </p>

      {email && (
        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
          <span className="opacity-60">✉️</span> {email}
        </p>
      )}
      {phone && (
        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
          <span className="opacity-60">📞</span> {phone}
        </p>
      )}
    </div>
  </div>
);

export default DashboardMahasiswa;