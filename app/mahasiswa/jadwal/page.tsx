"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
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
  Bell
} from "lucide-react";

export default function JadwalSeminarPage() {
  const [loading, setLoading] = useState(true);
  const [seminarData, setSeminarData] = useState<any>(null);
  const [sidangRequest, setSidangRequest] = useState<any>(null);

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
        setSidangRequest(null);
        return;
      }

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

      const { data: sidang } = await supabase
        .from("sidang_requests")
        .select("id, status")
        .eq("proposal_id", proposal.id)
        .maybeSingle();

      setSidangRequest(sidang ?? null);
    } catch (err) {
      console.error("Gagal fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasSeminar = !!seminarData;
  const hasSchedule = !!seminarData?.seminar_schedules;
  const sidangUnlocked = !!sidangRequest;

  const penguji1 = seminarData?.examiners?.find((e: any) => e.role === "penguji1")?.dosen?.nama;
  const penguji2 = seminarData?.examiners?.find((e: any) => e.role === "penguji2")?.dosen?.nama;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto custom-scrollbar">
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="relative w-96 group">
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors relative">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Jadwal Seminar & Sidang</h1>
            <p className="text-slate-500 font-medium mt-1">Status penjadwalan akademik Anda secara real-time.</p>
          </header>

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border shadow-xl shadow-slate-200/50">
              <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
              <p className="text-slate-400 font-bold animate-pulse">Menghubungkan ke database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* ================= SEMINAR ================= */}
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <ClipboardList size={200} />
                  </div>

                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <ClipboardList size={24} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Seminar Hasil Skripsi</h2>
                    </div>
                    {hasSchedule && (
                      <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200 tracking-widest uppercase shadow-sm">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 min-h-[200px] flex flex-col justify-center">
                    {!hasSeminar && (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Belum ada pengajuan seminar</p>
                      </div>
                    )}

                    {hasSeminar && !hasSchedule && (
                      <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100 flex items-start gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-100">
                          <FileCheck size={28} />
                        </div>
                        <div>
                          <p className="font-black text-amber-900 uppercase tracking-tight mb-1 text-sm">Menunggu Penjadwalan</p>
                          <p className="text-amber-800/80 text-sm font-medium leading-relaxed">
                            Pengajuan seminar Anda telah diterima. Kaprodi sedang menjadwalkan waktu, ruangan, dan dewan penguji.
                          </p>
                        </div>
                      </div>
                    )}

                    {hasSchedule && (
                      <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                          <Info icon={<Calendar size={18}/>} label="Hari & Tanggal" value={formatDate(seminarData.seminar_schedules.tanggal)} />
                          <Info icon={<Clock size={18}/>} label="Waktu Pelaksanaan" value={`${seminarData.seminar_schedules.jam.slice(0,5)} WIB`} />
                          <Info icon={<MapPin size={18}/>} label="Lokasi Ruangan" value={seminarData.seminar_schedules.ruangan} />
                        </div>

                        <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                          <div className="absolute top-0 right-0 p-6 opacity-10">
                            <UserCheck size={80} />
                          </div>
                          <p className="text-[10px] font-black uppercase text-slate-500 mb-8 flex items-center gap-2 tracking-[0.2em]">
                            <ShieldCheck size={14} className="text-blue-500" /> Dewan Penguji
                          </p>
                          <div className="space-y-6">
                            <div>
                              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Penguji Utama</p>
                              <p className="font-bold text-lg text-slate-100">{penguji1 || "Menunggu..."}</p>
                            </div>
                            <div className="h-px bg-slate-800" />
                            <div>
                              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Penguji Anggota</p>
                              <p className="font-bold text-lg text-slate-100">{penguji2 || "Menunggu..."}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ================= SIDANG ================= */}
              <div className="lg:col-span-4">
                <div
                  className={`rounded-[2.5rem] p-10 text-center transition-all duration-500 h-full flex flex-col justify-center border
                    ${sidangUnlocked
                      ? "bg-white border-white shadow-2xl shadow-indigo-200"
                      : "bg-slate-100/50 border-slate-200 opacity-80 grayscale"}
                  `}
                >
                  <div className={`w-24 h-24 mx-auto mb-8 rounded-[2rem] flex items-center justify-center transition-transform duration-500 group
                    ${sidangUnlocked ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110" : "bg-white text-slate-400 shadow-inner"}`}>
                    <GraduationCap size={48} className={sidangUnlocked ? "animate-bounce-subtle" : ""} />
                  </div>

                  <h3 className="text-2xl font-black mb-3 text-slate-800 uppercase tracking-tighter">Sidang Skripsi</h3>

                  <p className="text-xs font-medium text-slate-500 mb-8 leading-loose px-4 italic">
                    {sidangUnlocked
                      ? "Tahap akhir perjuangan Anda telah dijadwalkan. Siapkan materi presentasi terbaik Anda."
                      : <>Terbuka otomatis setelah dokumen <span className="text-emerald-600 font-black">Perbaikan Seminar</span> diverifikasi sistem.</>
                    }
                  </p>

                  <div className={`inline-flex items-center gap-2 mx-auto px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm
                    ${sidangUnlocked ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-400"}`}>
                    {sidangUnlocked ? <ShieldCheck size={14}/> : <LockIcon size={14}/>} 
                    {sidangUnlocked ? "DIAJUKAN" : "LOCKED"}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LockIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  )
}

/* ================= SMALL COMPONENT ================= */
function Info({ icon, label, value }: any) {
  return (
    <div className="flex gap-5 bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 transform translate-x-1 group-hover:translate-x-0 transition-transform" />
      <div className="text-blue-600 p-3 bg-blue-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">{label}</p>
        <p className="font-bold text-slate-700 text-sm tracking-tight">{value}</p>
      </div>
    </div>
  );
}