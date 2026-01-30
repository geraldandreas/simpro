"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar-dosen"; 
import Link from "next/link";
import { 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================

interface MahasiswaBimbingan {
  proposal_id: string;
  nama: string;
  npm: string;
  uiStatusLabel: string;
  uiStatusColor: string;
}

// ================= STATUS MAPPER =================

function mapStatusToUI(params: {
  proposalStatus: string | null;
  hasSeminar: boolean;
}) {
  const { proposalStatus, hasSeminar } = params;

  if (
    proposalStatus === "Menunggu Persetujuan Dosbing" ||
    proposalStatus === "Pengajuan Proposal"
  ) {
    return { label: "Pengajuan Proposal", color: "bg-[#F4BE37]" };
  }

  if (proposalStatus === "Diterima" && hasSeminar) {
    return { label: "Proses Kesiapan Seminar", color: "bg-[#5D9CEC]" };
  }

  if (proposalStatus === "Diterima") {
    return { label: "Proses Bimbingan", color: "bg-[#96A69D]" };
  }

  return { label: proposalStatus ?? "-", color: "bg-gray-400" };
}

// ================= PAGE =================

export default function MahasiswaBimbinganPage() {
  // Data
  const [students, setStudents] = useState<MahasiswaBimbingan[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: simpan dosenId agar bisa dipakai global
  const [dosenId, setDosenId] = useState<string | null>(null);

  // Form state
  const [metode, setMetode] = useState("Luring");
  const [sesi, setSesi] = useState("1");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [hour, setHour] = useState("02");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("PM");

  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  // ================= FETCH =================

  const fetchMahasiswaBimbingan = async () => {
    try {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id;

      if (!uid) return;

      // ✅ SIMPAN DOSEN ID KE STATE
      setDosenId(uid);

      const { data, error } = await supabase
        .from("thesis_supervisors")
        .select(`
          proposal:proposals (
            id,
            status,
            mahasiswa:profiles (
              nama,
              npm
            ),
            seminar:seminar_requests (
              id
            )
          )
        `)
        .eq("dosen_id", uid);

      if (error) throw error;

      const mapped: MahasiswaBimbingan[] = (data || []).map((row: any) => {
        const proposal = row.proposal;
        const hasSeminar = (proposal?.seminar?.length ?? 0) > 0;

        const ui = mapStatusToUI({
          proposalStatus: proposal.status,
          hasSeminar,
        });

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

  useEffect(() => {
    fetchMahasiswaBimbingan();
  }, []);

  // ================= CALENDAR LOGIC =================

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
  };

  const renderCalendarDays = () => {
    const days: JSX.Element[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelected =
        selectedDate && isSameDay(date, selectedDate);

      days.push(
        <div
          key={d}
          onClick={() => handleDateClick(d)}
          className={`text-xs font-medium py-1.5 rounded cursor-pointer transition-colors
            ${
              isSelected
                ? "bg-[#365b8e] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
        >
          {d}
        </div>
      );
    }

    return days;
  };

  const formatDateInput = () => {
    if (!selectedDate) return "";
    return selectedDate.toISOString().split("T")[0];
  };

  const handleDeleteSchedule = () => {
    setSelectedDate(null);
  };

  // ================= TIME FORMAT =================

  const buildTime24 = () => {
    let h = parseInt(hour, 10);

    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    return `${h.toString().padStart(2, "0")}:${minute}:00`;
  };

  // ================= SAVE HANDLER =================

  const handleApplySchedule = async () => {
    try {
      if (!dosenId) {
        alert("Dosen belum terautentikasi");
        return;
      }

      if (!selectedDate) {
        alert("Tanggal belum dipilih");
        return;
      }

      if (students.length === 0) {
        alert("Tidak ada mahasiswa bimbingan");
        return;
      }

      setSaving(true);

      const tanggal = formatDateInput();
      const jam = buildTime24();

      console.log("📅 APPLY SCHEDULE DEBUG", {
        tanggal,
        jam,
        sesi,
        metode,
        catatan,
        students,
        dosenId,
      });

      const payload = students.map((mhs) => ({
        proposal_id: mhs.proposal_id,
        sesi_ke: Number(sesi),
        tanggal,
        jam,
        metode,
        catatan,
        status: "belum_dimulai",
        dosen_id: dosenId, // ✅ FIX: sekarang pasti terdefinisi
      }));

      const { error } = await supabase
        .from("guidance_sessions")
        .insert(payload);

      if (error) throw error;

      alert("✅ Jadwal bimbingan berhasil diterapkan ke semua mahasiswa");

    } catch (err) {
      console.error("❌ Gagal simpan jadwal:", err);
      alert("Gagal menyimpan jadwal bimbingan");
    } finally {
      setSaving(false);
    }
  };

  // ================= RENDER =================
  // ⬇️ SELURUH UI TETAP SAMA (tidak diubah)

  // ================= RENDER =================

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <button className="relative p-2 hover:bg-gray-50 rounded-full">
            <Bell size={22} className="text-gray-400" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </header>

        {/* MAIN */}
        <main className="flex-1 p-8">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Mahasiswa Bimbingan
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Daftar mahasiswa yang berada di bawah bimbingan Anda.
              <br />
              Pantau progress skripsi mahasiswa dan beri persetujuan akademik.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* LEFT PANEL */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
              <div className="px-6 py-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  Daftar Mahasiswa Bimbingan
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500">
                        Nama Mahasiswa
                      </th>
                      <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500">
                        NPM
                      </th>
                      <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 text-center">
                        Progres Skripsi
                      </th>
                      <th className="px-6 py-4 text-xs uppercase font-bold text-gray-500 text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                          Memuat data mahasiswa...
                        </td>
                      </tr>
                    )}

                    {!loading && students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                          Belum ada mahasiswa bimbingan.
                        </td>
                      </tr>
                    )}

                    {students.map((mhs) => (
                      <tr key={mhs.proposal_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-6 text-sm font-bold text-gray-900">
                          {mhs.nama}
                        </td>

                        <td className="px-6 py-6 text-sm text-gray-500 font-medium">
                          {mhs.npm}
                        </td>

                        <td className="px-6 py-6 text-center">
                          <span
                            className={`inline-block px-4 py-2 rounded-full text-white text-[11px] font-bold shadow-sm ${mhs.uiStatusColor}`}
                          >
                            {mhs.uiStatusLabel}
                          </span>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <Link
        href={
          mhs.uiStatusLabel === "Pengajuan Proposal"
            ? `/dosen/accproposal?id=${mhs.proposal_id}`
            : `/dosen/detailmahasiswabimbingan?id=${mhs.proposal_id}`
        }
        className="inline-block px-5 py-2.5 bg-[#9ca3af] hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
      >
        Lihat Detail
      </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
              
              <h2 className="text-lg font-bold text-gray-900 mb-4">Jadwal Bimbingan</h2>

              {/* Kalender */}
              <div className="border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4 px-1 border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-900 text-sm">
                    {currentMonth.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setCurrentMonth(new Date(year, month - 1, 1))
                      }
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <button
                      onClick={() =>
                        setCurrentMonth(new Date(year, month + 1, 1))
                      }
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center gap-y-2 mb-2">
                  {['S','S','R','K','J','S','M'].map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-800">{d}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 text-center gap-y-1">
                  {renderCalendarDays()}
                </div>
              </div>

              {/* FORM */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Atur Jadwal Bimbingan
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="date"
                      value={formatDateInput()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 bg-white"
                    />

                    {/* JAM */}
                    <div className="flex gap-1">
                      <select
                        value={hour}
                        onChange={(e) => setHour(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                          const val = h.toString().padStart(2, "0");
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>

                      <select
                        value={minute}
                        onChange={(e) => setMinute(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white"
                      >
                        {["00", "15", "30", "45"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as "AM" | "PM")}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white"
                      >
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Sesi Bimbingan ke-
                  </label>

                  <div className="relative">
                    <select 
                      value={sesi}
                      onChange={(e) => setSesi(e.target.value)}
                      className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 bg-white"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="8" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Pilih Metode Bimbingan
                  </label>

                  <div className="flex gap-6">
                    {["Luring", "Daring"].map((m) => (
                      <label key={m} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium">
                        <input
                          type="radio"
                          checked={metode === m}
                          onChange={() => setMetode(m)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="-- Catatan Ruangan/Link Zoom --" 
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full border border-gray-300 border-dashed rounded-lg px-3 py-2.5 text-xs text-center"
                />

                <button
                  onClick={handleApplySchedule}
                  disabled={saving}
                  className="w-full bg-[#365b8e] hover:bg-[#2a466f] text-white font-bold py-3 rounded-lg text-xs shadow-md transition-all disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Terapkan untuk semua mahasiswa bimbingan"}
                </button>

                {selectedDate && (
                  <button 
                    onClick={handleDeleteSchedule}
                    className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold py-3 rounded-lg text-xs shadow-md transition-all"
                  >
                    Hapus Jadwal
                  </button>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
