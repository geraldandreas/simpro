"use client";

import { JSX, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar-dosen";

import { 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  User,
  Calendar as CalendarIcon,
  ArrowRight,
  MapPin,
  Video
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================

export interface MahasiswaBimbingan {
  proposal_id: string;
  nama: string;
  npm: string;
  uiStatusLabel: string;
  uiStatusColor: string;
}

// ================= STATUS MAPPER =================

export function mapStatusToUI(params: {
  proposalStatus: string | null;
  hasSeminar: boolean;
}) {
  const { proposalStatus, hasSeminar } = params;

  if (
    proposalStatus === "Menunggu Persetujuan Dosbing" ||
    proposalStatus === "Pengajuan Proposal"
  ) {
    return { label: "Pengajuan Proposal", color: "bg-amber-100 text-amber-700 border-amber-200" };
  }

  if (proposalStatus === "Diterima" && hasSeminar) {
    return { label: "Proses Kesiapan Seminar", color: "bg-blue-100 text-blue-700 border-blue-200" };
  }

  if (proposalStatus === "Diterima") {
    return { label: "Proses Bimbingan", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
  }

  return { label: proposalStatus ?? "-", color: "bg-slate-100 text-slate-600 border-slate-200" };
}

// ================= PAGE =================

export default function MahasiswaBimbinganKaprodiPage() {
  // Data
  const [students, setStudents] = useState<MahasiswaBimbingan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dosenId, setDosenId] = useState<string | null>(null);

  // Form state
  const [metode, setMetode] = useState("Luring");
  const [sesi, setSesi] = useState("1");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hour, setHour] = useState("02");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("PM");
  const [keterangan, setketerangan] = useState("");
  const [saving, setSaving] = useState(false);

  // ================= FETCH (Logika Backend Tetap) =================

  const fetchMahasiswaBimbingan = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id;
      if (!uid) return;
      setDosenId(uid);

      const { data, error } = await supabase
        .from("thesis_supervisors")
        .select(`
          proposal:proposals (
            id, status,
            mahasiswa:profiles ( nama, npm ),
            seminar:seminar_requests ( id )
          )
        `)
        .eq("dosen_id", uid);
        console.log("data", data)

      if (error) throw error;

      const mapped: MahasiswaBimbingan[] = (data || []).map((row: any) => {
        const proposal = row.proposal;
        const hasSeminar = (proposal?.seminar?.length ?? 0) > 0;
        const ui = mapStatusToUI({ proposalStatus: proposal.status, hasSeminar });

        return {
          proposal_id: proposal.id,
          nama: proposal.mahasiswa.nama,
          npm: proposal.mahasiswa.npm,
          uiStatusLabel: ui.label,
          uiStatusColor: ui.color,
        };
      });
      setStudents(mapped);
    } catch (err) {
      console.error("❌ Gagal load mahasiswa bimbingan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMahasiswaBimbingan(); }, []);

  // ================= CALENDAR LOGIC =================

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const renderCalendarDays = () => {
    const days: JSX.Element[] = [];
    for (let i = 0; i < firstDayIndex; i++) { days.push(<div key={`empty-${i}`} />); }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      days.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`text-[11px] font-black w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer transition-all
            ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  const formatDateInput = () => selectedDate ? selectedDate.toISOString().split("T")[0] : "";
  const buildTime24 = () => {
    let h = parseInt(hour, 10);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${minute}:00`;
  };

  const handleApplySchedule = async () => {
    try {
      if (!dosenId || !selectedDate || students.length === 0) {
        alert("Mohon lengkapi data jadwal dan mahasiswa.");
        return;
      }
      setSaving(true);
      const payload = students.map((mhs) => ({
        proposal_id: mhs.proposal_id,
        sesi_ke: Number(sesi),
        tanggal: formatDateInput(),
        jam: buildTime24(),
        metode,
        keterangan,
        status: "belum_dimulai",
        dosen_id: dosenId,
      }));
      const { error } = await supabase.from("guidance_sessions").insert(payload);
      if (error) throw error;
      alert("✅ Jadwal bimbingan berhasil diterapkan ke semua mahasiswa");
    } catch (err) {
      alert("Gagal menyimpan jadwal bimbingan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F4F7FE] font-sans text-slate-700">
      
      {/* HEADER */}
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

      {/* MAIN */}
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Mahasiswa Bimbingan
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Kelola jadwal konsultasi dan pantau progres akademik mahasiswa bimbingan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT PANEL (STUDENT TABLE) */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100">
                <User size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Daftar Mahasiswa
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-6">Mahasiswa</th>
                    <th className="px-8 py-6 text-center">Progres Skripsi</th>
                    <th className="px-8 py-6 text-center">Tindakan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse">
                        Menghubungkan ke database...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                        Belum ada mahasiswa bimbingan.
                      </td>
                    </tr>
                  ) : (
                    students.map((mhs) => (
                      <tr key={mhs.proposal_id} className="group hover:bg-blue-50/30 transition-all duration-300">
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {mhs.nama.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 leading-none">{mhs.nama}</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{mhs.npm}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-8 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${mhs.uiStatusColor}`}>
                            {mhs.uiStatusLabel}
                          </span>
                        </td>

                        <td className="px-8 py-8 text-center">
                          <Link
                            href={
                              mhs.uiStatusLabel === "Pengajuan Proposal"
                                ? `/dosen/accproposal?id=${mhs.proposal_id}`
                                : `/dosen/detailmahasiswabimbingan?id=${mhs.proposal_id}`
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                          >
                            Detail <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT PANEL (SCHEDULER) */}
          <div className="lg:col-span-4 space-y-8 sticky top-24">
            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100">
                  <CalendarIcon size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Atur Jadwal</h2>
              </div>

              {/* Kalender Modern */}
              <div className="bg-slate-50/50 rounded-2xl p-5 mb-8 border border-slate-100 shadow-inner">
                <div className="flex items-center justify-between mb-6 px-1">
                  <span className="font-black text-slate-800 text-xs uppercase tracking-widest">
                    {currentMonth.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"><ChevronLeft size={16} /></button>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"><ChevronRight size={16} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center gap-y-3 mb-4">
                  {['S','S','R','K','J','S','M'].map((d, i) => (
                    <div key={i} className="text-[10px] font-black text-slate-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 text-center gap-y-2">
                  {renderCalendarDays()}
                </div>
              </div>

              {/* FORM JADWAL */}
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Waktu Bimbingan
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="date" value={formatDateInput()} readOnly className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none" />
                    </div>
                    <div className="flex gap-1">
                      <select value={hour} onChange={(e) => setHour(e.target.value)} className="flex-1 px-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none text-center">
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select value={minute} onChange={(e) => setMinute(e.target.value)} className="flex-1 px-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none text-center">
                        {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={period} onChange={(e) => setPeriod(e.target.value as "AM" | "PM")} className="w-14 px-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 outline-none appearance-none text-center">
                        <option>AM</option><option>PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Sesi</label>
                    <select value={sesi} onChange={(e) => setSesi(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(num => <option key={num} value={num}>Sesi {num}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Metode</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                      {["Luring", "Daring"].map(m => (
                        <button key={m} onClick={() => setMetode(m)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black transition-all ${metode === m ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                          {m === "Luring" ? <MapPin size={12}/> : <Video size={12}/>} {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <textarea 
                  placeholder="Catatan Ruangan atau Link Virtual..." 
                  value={keterangan}
                  onChange={(e) => setketerangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-4 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-400 outline-none resize-none min-h-[80px]"
                />

                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleApplySchedule}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.1em] shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Memproses..." : "Terapkan Jadwal Masal"}
                  </button>
                  {selectedDate && (
                    <button onClick={() => setSelectedDate(null)} className="w-full text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors py-2">
                      Reset Jadwal
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}