"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation";

import { 
  FileText, Bell, Check, X, Clock, MessageSquare, 
  ShieldCheck, AlertCircle, ChevronRight, User, Lock
} from 'lucide-react';

const DashboardMahasiswa: React.FC = () => {
  const router = useRouter(); // Inisialisasi router
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

  type Supervisor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'Pembimbing Utama' | 'Co-Pembimbing';
};

const [supervisors, setSupervisors] = useState<Supervisor[]>([]);


  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        const userId = auth.user.id;

    
      // 1. PROPOSAL
      // ===============================
      const { data: proposal } = await supabase
        .from("proposals")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle();

      // default
      let step = 0;

      if (!proposal) {
        setActiveStep(0);
        return;
      }
      step = 1; // pengajuan judul
      
        // 2. Cek Bimbingan & Supervisor
        const { data: supervisorData } = await supabase
        .from('thesis_supervisors')
        .select(`
          role,
          profiles!dosen_id (
            id,
            nama,
            email,
            phone
          )
        `)
        .eq('proposal_id', proposal.id);

        const { data: sessions } = await supabase.from('guidance_sessions').select('dosen_id, session_feedbacks(status_revisi)').eq('proposal_id', proposal.id).eq('kehadiran_mahasiswa', 'hadir');
        const { data: seminarReq } = await supabase.from('seminar_requests').select('approved_by_p1, approved_by_p2, status').eq('proposal_id', proposal.id).maybeSingle();

       if (supervisorData) {
           const mapped: Supervisor[] = supervisorData.map((s: any) => ({
            id: s.profiles.id,
            name: s.profiles.nama,
            email: s.profiles.email,
            phone: s.profiles.phone,
            role:
              s.role === 'utama' || s.role === 'pembimbing1'
                ? 'Pembimbing Utama'
                : 'Co-Pembimbing',
        }));

  setSupervisors(mapped);
}

const { data: supervisorRoles } = await supabase
  .from('thesis_supervisors')
  .select('dosen_id, role')
  .eq('proposal_id', proposal.id);

let p1Count = 0;
let p2Count = 0;

       supervisorRoles?.forEach(sp => {
  const count =
    sessions?.filter(
      (s: any) =>
        s.dosen_id === sp.dosen_id &&
        s.session_feedbacks?.[0]?.status_revisi !== 'revisi'
    ).length || 0;

  if (sp.role === 'utama' || sp.role === 'pembimbing1') p1Count = count;
  else p2Count = count;
});


        const approvedByAll = seminarReq?.approved_by_p1 === true && seminarReq?.approved_by_p2 === true;
        const eligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;
      
  
        setBimbinganCount({ p1: p1Count, p2: p2Count });
        setIsAccDosen(approvedByAll);
        setIsEligible(eligible);
        setStats(prev => ({ ...prev, bimbingan: p1Count + p2Count }));

        // 3. Logic Timeline
        if (proposal.status === "Menunggu Persetujuan Dosbing") { setActiveStep(1); }
        else if (proposal.status === "Diterima") {
          if (!eligible) setActiveStep(2);
          else if (!seminarReq || seminarReq.status === 'draft') setActiveStep(3);
          else setActiveStep(5);
        }

        // 4. Statistik Dokumen
        const { data: docs } = await supabase
  .from('seminar_documents')
  .select('*')
  .eq('proposal_id', proposal.id);

if (docs) {
  const map: { [key: string]: DocumentData } = {};
  docs.forEach(d => {
    map[d.nama_dokumen] = {
      id: d.id,
      status: d.status,
      file_url: d.file_url,
    };
  });

  setDocuments(map);

  setStats(prev => ({
    ...prev,
    docs: docs.filter(d => d.status === 'Lengkap').length
  }));
}

      } catch (err) { console.error(err); } finally { setLoadingStep(false); }
    };
    loadDashboardData();
  }, []);

  const docPercentage = Math.round((stats.docs / 17) * 100);

   const totalSteps = 9
  const stepWidth = 100 / (totalSteps - 1)

  // hijau sampai step sebelum biru
  const greenWidth =
    activeStep >= 2 ? (activeStep - 1) * stepWidth : activeStep * stepWidth

  // biru hanya 1 segmen
  const blueWidth =
    activeStep >= 2 ? stepWidth : 0


  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans text-slate-700">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group">
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Minimalist SIMPRO Text */}
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
              Simpro
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {/* GATEKEEPING ALERT CARD */}
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

            {/* TIMELINE SECTION */}
            <section className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white mb-10 overflow-hidden relative">
               <div className="flex justify-between items-center mb-10">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Linimasa Skripsi</h3>
                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100 uppercase tracking-widest">
                  Tahap {activeStep + 1}
                </span>
              </div>
              <div className="relative pt-4 pb-8">
                <div className="absolute top-[38px] left-6 w-full h-1.5 bg-slate-100 rounded-full z-0" />
                {/* HIJAU */}
                <div
                  className="absolute top-[38px] left-6 h-1.5 bg-green-600 rounded-full z-0 transition-all duration-700"
                  style={{ width: `${greenWidth}%` }}
                />

                {/* BIRU */}
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

            {/* CARDS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Card 1: Circular Progress Documents */}
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
                   <DocumentItem
                      label="Berita Acara Bimbingan"
                      status={getDocStatus('berita_acara_bimbingan')}
                    />

                    <DocumentItem
                      label="Transkrip Nilai (Disahkan)"
                      status={getDocStatus('transkrip_nilai')}
                    />

                    <DocumentItem
                      label="Formulir Sidang TA"
                      status={getDocStatus('pengajuan_sidang')}
                    />

                   
                   <button 
                    disabled={!isEligible} 
                    onClick={() => router.push('/mahasiswa/uploaddokumen')} // Navigasi ke halaman upload
                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-6 transition-all ${isEligible ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                   >
                     Detail Dokumen <ChevronRight size={14} />
                   </button>
                </div>
              </div>

              {/* Card 2: Summary Status */}
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

              {/* Card 3: Contacts */}

              <div className="lg:col-span-4 space-y-6">
                {supervisors.map(sp => (
  <ContactCard
    key={sp.id}
    name={sp.name}
    role={sp.role}
    email={sp.email}
    phone={sp.phone}
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

const ContactCard = ({ name, role, email, phone }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-center gap-4">
    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
      <User size={24} />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-black text-slate-800 truncate uppercase">{name}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {role}
      </p>

      {email && (
        <p className="text-[10px] text-slate-500 mt-1 truncate">
          ✉️ {email}
        </p>
      )}
      {phone && (
        <p className="text-[10px] text-slate-500 truncate">
          📞 {phone}
        </p>
      )}
    </div>
  </div>
);


export default DashboardMahasiswa;
