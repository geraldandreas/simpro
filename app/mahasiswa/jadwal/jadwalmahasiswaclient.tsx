"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import NotificationBell from '@/components/notificationBell';
import { supabase } from "@/lib/supabaseClient";
import {
  Calendar,
  Clock,
  FileCheck,
  AlertCircle,
  GraduationCap,
  ClipboardList,
  MapPin,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Search,
  Bell,
  Lock
} from "lucide-react";

export default function JadwalMahasiswaClient() {
  const [loading, setLoading] = useState(true);
  const [seminarData, setSeminarData] = useState<any>(null);
  const [sidangData, setSidangData] = useState<any>(null); // State untuk detail sidang

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: proposal } = await supabase
        .from("proposals")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!proposal) {
        setSeminarData(null);
        setSidangData(null);
        return;
      }

      // 1. Fetch Data Seminar Hasil
      const { data: seminar } = await supabase
        .from("seminar_requests")
        .select(`
          id,
          proposal_id,
          seminar_schedules (tanggal, jam, ruangan),
          examiners (role, dosen:profiles(nama))
        `)
        .eq("proposal_id", proposal.id)
        .eq("tipe", "seminar")
        .maybeSingle();

      setSeminarData(seminar ?? null);

      // 2. Fetch Data Sidang Akhir
      // Kita ambil detail jadwal dan penguji (jika ada relasi penguji untuk sidang)
      const { data: sidang } = await supabase
        .from("sidang_requests")
        .select(`
          id, 
          status, 
          tanggal_sidang, 
          jam_sidang, 
          ruangan
        `)
        .eq("proposal_id", proposal.id)
        .maybeSingle();

      setSidangData(sidang ?? null);

    } catch (err) {
      console.error("Gagal fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasSeminarSchedule = !!seminarData?.seminar_schedules;
  const isSidangScheduled = !!sidangData?.tanggal_sidang; // Cek apakah Kaprodi sudah isi jadwal

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto custom-scrollbar uppercase tracking-tighter">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                  <div className="flex items-center gap-6">
                    <div className="relative w-72 group">
                    </div>
                  </div>
        
                <div className="flex items-center gap-6">
            {/* KOMPONEN LONCENG BARU */}
            <NotificationBell />
            
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
        
                  <div className="flex items-center gap-6">
                    {/* Minimalist SIMPRO Text */}
                    <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                      Simpro
                    </span>
                  </div>
                  </div>
                </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Jadwal Seminar & Sidang</h1>
            <p className="text-slate-500 font-medium mt-3 tracking-normal normal-case font-serif">Status penjadwalan akademik Anda secara real-time.</p>
          </header>

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border shadow-xl shadow-slate-200/50">
              <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
              <p className="text-slate-400 font-bold animate-pulse">Sinkronisasi Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* ================= SECTION: SEMINAR HASIL ================= */}
              <div className="lg:col-span-7 space-y-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-8 relative z-10 font-black">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200"><ClipboardList size={24} /></div>
                      <h2 className="text-2xl uppercase tracking-tighter">Seminar Hasil</h2>
                    </div>
                    {hasSeminarSchedule && <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full border border-emerald-200 tracking-widest uppercase shadow-sm">Verified</span>}
                  </div>

                  {hasSeminarSchedule ? (
                    <div className="grid md:grid-cols-1 gap-6 relative z-10">
                      <div className="flex flex-wrap gap-4">
                        <ScheduleInfo icon={<Calendar size={18}/>} label="Tanggal" value={formatDate(seminarData.seminar_schedules.tanggal)} />
                        <ScheduleInfo icon={<Clock size={18}/>} label="Waktu" value={`${seminarData.seminar_schedules.jam.slice(0,5)} WIB`} />
                        <ScheduleInfo icon={<MapPin size={18}/>} label="Ruangan" value={seminarData.seminar_schedules.ruangan} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <AlertCircle className="mx-auto mb-4 text-slate-300" size={40} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Jadwal seminar belum ditetapkan</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= SECTION: SIDANG AKHIR ================= */}
              <div className="lg:col-span-5">
                <div className={`rounded-[2.5rem] p-10 transition-all duration-500 h-full border relative overflow-hidden
                    ${isSidangScheduled ? "bg-white border-white shadow-2xl shadow-indigo-200" : "bg-slate-100/50 border-slate-200 opacity-80"}`}>
                  
                  <div className="flex items-center gap-4 mb-8">
                     <div className={`p-3 rounded-2xl shadow-lg transition-colors ${isSidangScheduled ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-200 text-slate-400'}`}>
                        <GraduationCap size={24} />
                     </div>
                     <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Sidang Skripsi</h2>
                  </div>

                  {isSidangScheduled ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                       <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Informasi Pelaksanaan</p>
                          <div className="space-y-4 font-bold text-slate-700">
                             <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-indigo-600" />
                                <span className="text-sm">{formatDate(sidangData.tanggal_sidang)}</span>
                             </div>
                             <div className="flex items-center gap-3">
                                <Clock size={16} className="text-indigo-600" />
                                <span className="text-sm">{sidangData.jam_sidang.slice(0,5)} WIB</span>
                             </div>
                             <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-indigo-600" />
                                <span className="text-sm">Ruangan {sidangData.ruangan}</span>
                             </div>
                          </div>
                       </div>
                       <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                          <ShieldCheck size={20} className="text-emerald-600" />
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-relaxed">Jadwal Anda telah divalidasi oleh kaprodi.</p>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-4 shadow-inner">
                          <Lock size={32} />
                       </div>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Menunggu Penetapan Jadwal<br/>dari Kaprodi</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ScheduleInfo({ icon, label, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex-1 min-w-[200px] shadow-sm">
      <div className="flex items-center gap-3 text-blue-600 mb-3">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="font-bold text-slate-800 text-sm">{value}</p>
    </div>
  );
}