"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Bell, User, ChevronDown, FileText, ArrowLeft, Calendar, Clock, MapPin, ShieldCheck, Download
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface DosenOption {
  id: string;
  nama: string;
}

export default function PenetapanJadwalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("id");

  const [studentData, setStudentData] = useState<any>(null);
  const [lecturers, setLecturers] = useState<DosenOption[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
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
              id, judul, file_path,
              user:profiles(nama, npm),
              supervisors:thesis_supervisors(
                role,
                dosen:profiles(nama)
              )
            )
          `)
          .eq('id', requestId)
          .single();

        if (reqError) throw reqError;
        setStudentData(requestData);

        if (requestData?.proposal[0]?.file_path) {
          const { data: signed } = await supabase.storage
            .from('proposals')
            .createSignedUrl(requestData.proposal[0]?.file_path, 3600);
          setFileUrl(signed?.signedUrl ?? null);
        }

        const { data: dosenData } = await supabase
          .from('profiles')
          .select('id, nama')
          .eq('role', 'dosen')
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
        if (p1) setPenguji1(p1.dosen_id);
        if (p2) setPenguji2(p2.dosen_id);
      }
    };

    loadData();
  }, [requestId]);

  const handleTetapkanJadwal = async () => {
  if (!requestId || !studentData) return;
  if (!penguji1 || !penguji2 || !tanggal || !jam || !ruangan) {
    alert("Harap lengkapi semua form jadwal dan penguji.");
    return;
  }
  if (penguji1 === penguji2) {
    alert("Penguji 1 dan 2 tidak boleh sama.");
    return;
  }

  try {
    setLoading(true);

    // 1. Gunakan UPSERT untuk tabel jadwal agar tidak error duplicate key
    const { error: schedError } = await supabase
      .from('seminar_schedules')
      .upsert({
        seminar_request_id: requestId,
        tanggal: tanggal,
        jam: jam,
        ruangan: ruangan,
      }, { onConflict: 'seminar_request_id' }); // Sesuai dengan unique constraint

    if (schedError) throw schedError;

    // 2. Gunakan UPSERT untuk dewan penguji
    // Hapus data lama dulu atau gunakan upsert berdasarkan role
    const { error: deleteExamError } = await supabase
      .from('examiners')
      .delete()
      .eq('seminar_request_id', requestId);

    if (deleteExamError) throw deleteExamError;

    const { error: examError } = await supabase
      .from('examiners')
      .insert([
        { seminar_request_id: requestId, dosen_id: penguji1, role: 'penguji1' },
        { seminar_request_id: requestId, dosen_id: penguji2, role: 'penguji2' }
      ]);

    if (examError) throw examError;

    // 3. Update status ke 'Dijadwalkan' (Pastikan status ini ada di check constraint database)
    const { error: updateError } = await supabase
      .from('seminar_requests')
      .update({ status: 'Disetujui' }) 
      .eq('id', requestId);

    if (updateError) throw updateError;

    alert("✅ Jadwal seminar berhasil ditetapkan!");
    router.push('/kaprodi/dashboardkaprodi/pengajuanseminar');
  } catch (err: any) {
    // Menangkap error spesifik constraint
    alert("Gagal menetapkan jadwal: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const getSupervisor = (role: string) => {
    const sups = studentData?.proposal?.supervisors || [];
    const s = sups.find((item: any) => item.role === role);
    return s?.dosen?.nama || "-";
  };

  if (!studentData) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">Memuat data...</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700">
      
      {/* --- HEADER --- */}
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">

        {/* Navigation */}
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

          {/* LEFT COLUMN (Student Data) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Student Identity Card */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <User size={180} />
              </div>
              <div className="p-10 flex items-center gap-8 relative z-10">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shrink-0 overflow-hidden">
                  <User size={56} className="text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">{studentData.proposal.user.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">
                    {studentData.proposal.user.npm}
                  </p>
                </div>
              </div>

              <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" /> Judul Tugas Akhir
                </p>
                <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{studentData.proposal.judul}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100 bg-white">
                <div className="p-8 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100"><User size={22} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Utama</p>
                    <p className="text-sm font-bold text-slate-800">{getSupervisor('utama')}</p>
                  </div>
                </div>
                <div className="p-8 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100"><User size={22} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembimbing Pendamping</p>
                    <p className="text-sm font-bold text-slate-800">{getSupervisor('pendamping')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Card */}
    
          </div>

          {/* RIGHT COLUMN (Scheduling Form) */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
            
            {/* Date & Location Form */}
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

            {/* Examiners Form */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-8 overflow-hidden">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200"><ShieldCheck size={18} /></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Dewan Penguji</h2>
              </div>
              <div className="space-y-6">
                {[
                  { val: penguji1, set: setPenguji1, label: "Penguji Utama" },
                  { val: penguji2, set: setPenguji2, label: "Penguji Anggota" }
                ].map((p, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">{p.label}</label>
                    <div className="relative group">
                      <select value={p.val} onChange={(e) => p.set(e.target.value)} disabled={alreadyScheduled} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-4 px-5 pr-12 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all cursor-pointer shadow-inner">
                        <option value="">-- Pilih Dosen Penguji --</option>
                        {lecturers.map((lec) => (
                          <option key={lec.id} value={lec.id}>{lec.nama}</option>
                        ))}
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