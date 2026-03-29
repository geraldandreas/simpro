"use client";

import React, { useState, useEffect } from "react";
import NotificationBell from '@/components/notificationBell';
import Image from "next/image"; 
import { 
  Search, Bell, User, ChevronDown, FileText, ArrowLeft, Calendar, Clock, MapPin, ShieldCheck, Download
} from "lucide-react";
import Link from "next/link";
import { sendNotification } from "@/lib/notificationUtils";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface DosenOption {
  id: string;
  nama: string;
}

interface Supervisor {
  role: string;
  dosen_id: string; // 🔥 Tambahkan dosen_id untuk deteksi disable dropdown
  dosen: {
    nama: string;
    avatar_url?: string | null; // 🔥 Tambahkan avatar_url untuk dosen
  };
}

interface Document {
  nama_dokumen: string;
  file_url: string;
}

interface StudentDataProps {
  id: string;
  proposal: {
    id: string;
    judul: string;
    file_path: string;
    user_id: string;
    user: {
      nama: string;
      npm: string;
      avatar_url?: string | null; 
    };
    supervisors: Supervisor[];
    docs: Document[];
  };
}

export default function PenjadwalanSeminarKaprodiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("id");

  const [studentData, setStudentData] = useState<StudentDataProps | null>(null);
  const [lecturers, setLecturers] = useState<DosenOption[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [formJadwalUrl, setFormJadwalUrl] = useState<string | null>(null);
  
  // 🔥 TAMBAH STATE PENGUJI 3
  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
  const [penguji3, setPenguji3] = useState("");
  
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);

  useEffect(() => {
    if (!requestId) return;

    const loadData = async () => {
      try {
       const { data: requestData, error: reqError } = await supabase
          .from('seminar_requests')
          .select(`
            id,
            proposal:proposals (
              id, judul, file_path, user_id,
              user:profiles(nama, npm, avatar_url),
              supervisors:thesis_supervisors(
                role,
                dosen_id,
                dosen:profiles(nama, avatar_url) 
              ),
              docs:seminar_documents(nama_dokumen, file_url) 
            )
          `)
          .eq('id', requestId)
          .single();

        if (reqError) throw reqError;

        const normalizedProposal = Array.isArray(requestData?.proposal) 
          ? requestData.proposal[0] 
          : requestData?.proposal;

        const finalData: StudentDataProps = {
          id: requestData.id,
          proposal: normalizedProposal as any
        };

        setStudentData(finalData);

        if (finalData.proposal?.file_path) {
          const { data: signed } = await supabase.storage
            .from('proposals')
            .createSignedUrl(finalData.proposal.file_path, 3600);
          setFileUrl(signed?.signedUrl ?? null);
        }

        if (finalData.proposal?.docs) {
          const formJadwal = finalData.proposal.docs.find((d) => d.nama_dokumen === 'form_layak_dan_jadwal');
          if (formJadwal?.file_url) {
            const { data: signedDoc } = await supabase.storage
              .from('docseminar')
              .createSignedUrl(formJadwal.file_url, 3600);
            setFormJadwalUrl(signedDoc?.signedUrl ?? null);
          }
        }

        const { data: dosenData } = await supabase
          .from('profiles')
          .select('id, nama')
          .in('role', ['dosen', 'kaprodi'])
          .order('nama');
        
        setLecturers(dosenData || []);

      } catch (err) {
        console.error("Gagal memuat data:", err);
      }

      const { data: existingSchedule } = await supabase
        .from('seminar_schedules')
        .select('tanggal, jam, ruangan')
        .eq('seminar_request_id', requestId)
        .maybeSingle();

      if (existingSchedule) {
        setAlreadyScheduled(true);
        setTanggal(existingSchedule.tanggal ?? "");
        setJam(existingSchedule.jam ?? "");
        setRuangan(existingSchedule.ruangan ?? "");
      }

      const { data: examinerData } = await supabase
        .from('examiners')
        .select('dosen_id, role')
        .eq('seminar_request_id', requestId);

      if (examinerData && examinerData.length > 0) {
        const p1 = examinerData.find(e => e.role === 'penguji1');
        const p2 = examinerData.find(e => e.role === 'penguji2');
        const p3 = examinerData.find(e => e.role === 'penguji3'); // 🔥 Ambil data penguji 3 jika ada
        if (p1) setPenguji1(p1.dosen_id);
        if (p2) setPenguji2(p2.dosen_id);
        if (p3) setPenguji3(p3.dosen_id);
      }
    };

    loadData();
  }, [requestId]);

  const handleTetapkanJadwal = async () => {
    if (!requestId || !studentData) return;
    
    // 🔥 VALIDASI 3 PENGUJI
    if (!penguji1 || !penguji2 || !penguji3 || !tanggal || !jam || !ruangan) {
      alert("Harap lengkapi semua form jadwal dan ketiga dewan penguji.");
      return;
    }
    
    // Pastikan tidak ada dosen yang sama terpilih ganda
    const uniquePenguji = new Set([penguji1, penguji2, penguji3]);
    if (uniquePenguji.size !== 3) {
      alert("Ketiga dosen penguji tidak boleh ada yang sama.");
      return;
    }

    try {
      setLoading(true);

      const { error: schedError } = await supabase
        .from('seminar_schedules')
        .upsert({
          seminar_request_id: requestId,
          tanggal: tanggal,
          jam: jam,
          ruangan: ruangan,
        }, { onConflict: 'seminar_request_id' }); 

      if (schedError) throw schedError;

      const { error: deleteExamError } = await supabase
        .from('examiners')
        .delete()
        .eq('seminar_request_id', requestId);

      if (deleteExamError) throw deleteExamError;

      // 🔥 INSERT 3 PENGUJI KE DATABASE
      const { error: examError } = await supabase
        .from('examiners')
        .insert([
          { seminar_request_id: requestId, dosen_id: penguji1, role: 'penguji1' },
          { seminar_request_id: requestId, dosen_id: penguji2, role: 'penguji2' },
          { seminar_request_id: requestId, dosen_id: penguji3, role: 'penguji3' }
        ]);

      if (examError) throw examError;

      const { error: updateError } = await supabase
        .from('seminar_requests')
        .update({ status: 'Disetujui' }) 
        .eq('id', requestId);

      if (updateError) throw updateError;

      const studentId = studentData.proposal?.user_id;

      if (studentId) {
        const formattedDate = new Date(tanggal).toLocaleDateString('id-ID', { 
          day: 'numeric', month: 'long', year: 'numeric' 
        });

        await sendNotification(
          studentId,
          "Jadwal Seminar Ditetapkan",
          `Jadwal seminar Anda telah ditetapkan pada ${formattedDate} pukul ${jam} WIB di ${ruangan}.`
        );
      }

      alert("✅ Jadwal seminar berhasil ditetapkan!");
      router.push('/kaprodi/dashboardkaprodi/pengajuanseminar');
    } catch (err: any) {
      alert("Gagal menetapkan jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mengambil object lengkap supervisor
  const getSupervisorObj = (role: string) => {
    const sups = studentData?.proposal?.supervisors || [];
    return sups.find((item) => item.role === role);
  };

  if (!studentData) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">Memuat data...</div>;

  const activeProposal = studentData.proposal;
  const pUtama = getSupervisorObj('utama');
  const pPendamping = getSupervisorObj('pendamping');
  
  // 🔥 Ekstrak ID Pembimbing untuk mengunci pilihan di dropdown
  const supervisorIds = activeProposal.supervisors.map(s => s.dosen_id);

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700">
      
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

      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">

        <div className="flex items-center gap-5 mb-10">
          <Link href="/kaprodi/dashboardkaprodi/pengajuanseminar" className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Penetapan Jadwal Seminar</h1>
            <p className="text-slate-500 font-medium">Atur waktu pelaksanaan dan dewan penguji untuk mahasiswa.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          <div className="lg:col-span-8 space-y-8">
            
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <User size={180} />
              </div>
              <div className="p-10 flex items-center gap-8 relative z-10">
                
                {/* AVATAR MAHASISWA */}
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shrink-0 overflow-hidden relative">
                  {activeProposal.user?.avatar_url ? (
                    <Image 
                      src={activeProposal.user.avatar_url} 
                      alt={activeProposal.user.nama || "User"} 
                      layout="fill" 
                      objectFit="cover" 
                    />
                  ) : (
                    <User size={56} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">{activeProposal.user?.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">
                    {activeProposal.user?.npm}
                  </p>
                </div>
              </div>

              <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" /> Judul Tugas Akhir
                </p>
                <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{activeProposal.judul}"</p>
              </div>

              {/* 🔥 AVATAR PEMBIMBING UTAMA & PENDAMPING */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100 bg-white">
                <div className="p-8 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 relative overflow-hidden">
                    {pUtama?.dosen?.avatar_url ? (
                       <Image src={pUtama.dosen.avatar_url} alt="P1" layout="fill" objectFit="cover" />
                    ) : (
                       <User size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Utama</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{pUtama?.dosen?.nama || "-"}</p>
                  </div>
                </div>
                <div className="p-8 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 relative overflow-hidden">
                     {pPendamping?.dosen?.avatar_url ? (
                       <Image src={pPendamping.dosen.avatar_url} alt="P2" layout="fill" objectFit="cover" />
                    ) : (
                       <User size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Pendamping</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{pPendamping?.dosen?.nama || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-8 overflow-hidden">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><FileText size={18} /></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Dokumen Usulan Jadwal</h2>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-blue-50/50 border border-blue-100 p-6 rounded-2xl gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm shrink-0"><Calendar size={24} /></div>
                   <div>
                     <p className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Form Layak & Usulan Jadwal</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Berisi kesepakatan waktu yang diajukan oleh mahasiswa dan dosen pembimbing.</p>
                   </div>
                </div>
                {formJadwalUrl ? (
                   <a 
                     href={formJadwalUrl} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                   >
                     <Download size={14} /> Lihat PDF
                   </a>
                ) : (
                   <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-4 py-2 rounded-lg shrink-0">Belum Ada File</span>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 sticky top-28">
            
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-8 overflow-hidden">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Calendar size={18} /></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Detail Penjadwalan</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Hari & Tanggal</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} disabled={alreadyScheduled} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all shadow-inner" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Waktu Pelaksanaan</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input type="time" value={jam} onChange={(e) => setJam(e.target.value)} disabled={alreadyScheduled} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all shadow-inner" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Lokasi Ruangan</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input type="text" value={ruangan} onChange={(e) => setRuangan(e.target.value)} disabled={alreadyScheduled} placeholder="Contoh: Ruang Sidang 1" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all shadow-inner" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-8 overflow-hidden">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200"><ShieldCheck size={18} /></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Dewan Penguji</h2>
              </div>
              <div className="space-y-6">
                
                {/* 🔥 MENJADI 3 PENGUJI */}
                {[
                  { val: penguji1, set: setPenguji1, label: "Penguji Utama" },
                  { val: penguji2, set: setPenguji2, label: "Penguji Anggota 1" },
                  { val: penguji3, set: setPenguji3, label: "Penguji Anggota 2" }
                ].map((p, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">{p.label}</label>
                    <div className="relative group">
                      <select 
                        value={p.val} 
                        onChange={(e) => p.set(e.target.value)} 
                        disabled={alreadyScheduled} 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-4 px-5 pr-12 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="">-- Pilih Dosen Penguji --</option>
                        {lecturers.map((lec) => {
                          // 🔥 LOGIKA KUNCI DOSEN PEMBIMBING
                          const isSupervisor = supervisorIds.includes(lec.id);
                          return (
                            <option 
                              key={lec.id} 
                              value={lec.id} 
                              disabled={isSupervisor} // Disable jika dia pembimbing
                              className={isSupervisor ? "text-slate-300 italic" : "text-slate-800"}
                            >
                              {lec.nama} {isSupervisor ? " (Pembimbing)" : ""}
                            </option>
                          );
                        })}
                      </select>
                      {!alreadyScheduled && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleTetapkanJadwal}
                  disabled={loading || alreadyScheduled}
                  className={`w-full mt-4 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3
                    ${alreadyScheduled
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}
                  `}
                >
                  {alreadyScheduled ? (
                    <><ShieldCheck size={18} /> Penjadwalan Selesai</>
                  ) : loading ? (
                    "Memproses..."
                  ) : (
                    "Konfirmasi Jadwal"
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}