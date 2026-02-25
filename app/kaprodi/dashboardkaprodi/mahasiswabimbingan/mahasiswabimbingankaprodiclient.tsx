"use client";

import { JSX, useEffect, useState } from "react";
import NotificationBell from '@/components/notificationBell';
import { sendNotification } from "@/lib/notificationUtils";
import Link from "next/link";
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
  seminarStatus: string | null;
  hasSidang: boolean;
  verifiedDocsCount: number;
  uploadedDocsCount: number;
  isEligible: boolean;
}) {
  const { proposalStatus, seminarStatus, hasSidang, verifiedDocsCount, uploadedDocsCount, isEligible } = params;

  // 1. PRIORITAS TERTINGGI: Sidang
  if (hasSidang) {
    return { label: "Sidang Skripsi", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }

  // 2. PRIORITAS SEMINAR: Selesai atau Hasil Verifikasi Tendik
  if (seminarStatus === "Selesai") {
    return { label: "Perbaikan Pasca Seminar", color: "bg-orange-100 text-orange-700 border-orange-200" };
  }

  if (verifiedDocsCount >= 3) {
    return { label: "Seminar Hasil", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }

  // 3. LOGIKA TAHAP AWAL & GATEKEEPING BIMBINGAN
  if (proposalStatus === "Menunggu Persetujuan Dosbing" || proposalStatus === "Pengajuan Proposal") {
    return { label: "Pengajuan Proposal", color: "bg-amber-100 text-amber-700 border-amber-200" };
  }

  if (proposalStatus === "Diterima") {
    if (isEligible) {
      if (uploadedDocsCount >= 3) return { label: "Verifikasi Berkas", color: "bg-purple-100 text-purple-700 border-purple-200" };
      if (uploadedDocsCount > 0) return { label: "Unggah Dokumen Seminar", color: "bg-blue-100 text-blue-700 border-blue-200" };
      return { label: "Proses Kesiapan Seminar", color: "bg-blue-100 text-blue-700 border-blue-200" };
    }
    return { label: "Proses Bimbingan", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
  }

  return { label: proposalStatus ?? "-", color: "bg-slate-100 text-slate-600 border-slate-200" };
}

// ================= PAGE =================

export default function MahasiswaBimbinganKaprodiClient() {
  // Data
  const [students, setStudents] = useState<MahasiswaBimbingan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dosenId, setDosenId] = useState<string | null>(null);
  const [dosenName, setDosenName] = useState("");

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

    const { data: profile } = await supabase.from("profiles").select("nama").eq("id", uid).single();
    if (profile) setDosenName(profile.nama);

    // Fetch data dengan relasi lengkap agar sinkron dengan DetailProgresTendik
    const { data, error } = await supabase
      .from("thesis_supervisors")
      .select(`
        proposal:proposals (
          id, status,
          mahasiswa:profiles ( nama, npm ),
          seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at ),
          sidang:sidang_requests ( id ),
          docs:seminar_documents ( status ),
          supervisors:thesis_supervisors ( role, dosen_id ),
          sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
        )
      `)
      .eq("dosen_id", uid);

    if (error) throw error;

    const mapped: MahasiswaBimbingan[] = (data || []).map((row: any) => {
      const p = row.proposal;
      
      // A. Ambil Seminar Request Terbaru
      const activeSeminar = p.seminar?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;
      
      // B. Cek Eksistensi Jadwal Sidang
      const hasSidang = Array.isArray(p.sidang) && p.sidang.length > 0;

      // C. Hitung Berkas Tervalidasi Tendik
      const docs = p.docs || [];
      const verifiedCount = docs.filter((d: any) => d.status === 'Lengkap').length;

      // D. Hitung Bimbingan Per-Peran (P1 & P2)
      let p1Count = 0;
      let p2Count = 0;
      p.supervisors?.forEach((sp: any) => {
        const count = p.sessions?.filter((s: any) => 
          s.dosen_id === sp.dosen_id && 
          s.kehadiran_mahasiswa === 'hadir' &&
          s.session_feedbacks?.[0]?.status_revisi === "disetujui"
        ).length || 0;

        if (sp.role === "utama") p1Count = count;
        else if (sp.role === "pendamping") p2Count = count;
      });

      // E. Tentukan Kelayakan (isEligible)
      const approvedByAll = !!activeSeminar?.approved_by_p1 && !!activeSeminar?.approved_by_p2;
      const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

      const ui = mapStatusToUI({ 
        proposalStatus: p.status, 
        hasSeminar: !!activeSeminar,
        seminarStatus: activeSeminar?.status,
        hasSidang: hasSidang,
        verifiedDocsCount: verifiedCount,
        uploadedDocsCount: docs.length,
        isEligible: isEligible
      });

      return {
        proposal_id: p.id,
        nama: p.mahasiswa.nama,
        npm: p.mahasiswa.npm,
        uiStatusLabel: ui.label,
        uiStatusColor: ui.color,
      };
    });
    setStudents(mapped);
  } catch (err) {
    console.error("❌ Gagal load data:", err);
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
    
    // Sesuaikan index hari pertama (Standard JS 0=Minggu, Kalender kita mulai dari Senin)
    // Jika firstDayIndex = 0 (Minggu), ubah jadi 6 agar berada di akhir baris
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    for (let i = 0; i < adjustedFirstDay; i++) { 
      days.push(<div key={`empty-${i}`} />); 
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      days.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`text-[11px] font-black w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer transition-all
            ${isSelected 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" 
              : isToday 
                ? "bg-blue-50 text-blue-600 border border-blue-100" 
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}
        >
          {d}
        </div>
      );
    }
    return days;
  };

 
const formatDateInput = () => {
  if (!selectedDate) return "";
  const y = selectedDate.getFullYear();
  const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
  const d = selectedDate.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};
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

      const localDate = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

      // 1. Simpan Jadwal ke Database
      const payload = students.map((mhs) => ({
        proposal_id: mhs.proposal_id,
        sesi_ke: Number(sesi),
        tanggal: localDate,
        jam: buildTime24(),
        metode,
        keterangan,
        status: "belum_dimulai",
        dosen_id: dosenId,
      }));

      const { error } = await supabase.from("guidance_sessions").insert(payload);
      if (error) throw error;

      // 🔥 2. KIRIM NOTIFIKASI MASSAL KE SETIAP MAHASISWA
      const tglFormat = selectedDate.toLocaleDateString("id-ID", { 
        day: "numeric", month: "long", year: "numeric" 
      });

      const notificationPromises = students.map(async (mhs) => {
        // Ambil user_id mahasiswa berdasarkan proposal_id
        const { data: prop } = await supabase
          .from("proposals")
          .select("user_id")
          .eq("id", mhs.proposal_id)
          .single();

        if (prop?.user_id) {
          // Kirim pesan spesifik berisi Nama Dosen dan Nomor Sesi
          return sendNotification(
            prop.user_id,
            "Jadwal Bimbingan Baru",
            `Dosen ${dosenName} telah menetapkan jadwal bimbingan Sesi ${sesi} pada tanggal ${tglFormat} pukul ${hour}:${minute} ${period}.`
          );
        }
      });

      // Jalankan semua pengiriman secara paralel untuk kecepatan
      await Promise.all(notificationPromises);

      alert(`✅ Jadwal bimbingan Sesi ${sesi} berhasil diterapkan dan notifikasi terkirim!`);
    } catch (err) {
      console.error(err);
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
                                ? `/kaprodi/dashboardkaprodi/accproposal?id=${mhs.proposal_id}`
                                : `/kaprodi/dashboardkaprodi/detailmahasiswabimbingan?id=${mhs.proposal_id}`
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