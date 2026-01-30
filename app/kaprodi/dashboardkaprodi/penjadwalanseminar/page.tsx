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

        if (requestData?.proposal?.file_path) {
          const { data: signed } = await supabase.storage
            .from('proposals')
            .createSignedUrl(requestData.proposal.file_path, 3600);
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
      const { error: schedError } = await supabase
        .from('seminar_schedules')
        .insert({
          seminar_request_id: requestId,
          tanggal: tanggal,
          jam: jam,
          ruangan: ruangan,
        });

      if (schedError) throw schedError;

      const { error: examError } = await supabase
        .from('examiners')
        .insert([
          { seminar_request_id: requestId, dosen_id: penguji1, role: 'penguji1' },
          { seminar_request_id: requestId, dosen_id: penguji2, role: 'penguji2' }
        ]);

      if (examError) throw examError;

      const { error: updateError } = await supabase
        .from('seminar_requests')
        .update({ status: 'Dijadwalkan' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      alert("✅ Jadwal seminar berhasil ditetapkan!");
      router.push('/kaprodi/dashboardkaprodi/pengajuanseminar');
    } catch (err: any) {
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
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input type="text" placeholder="Cari data bimbingan..." className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-sm outline-none transition-all shadow-inner" />
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 ml-2 uppercase tracking-tighter">K</div>
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
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><FileText size={20} /></div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter text-[13px]">Dokumen Skripsi</h3>
              </div>
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex flex-col md:flex-row items-center justify-between group hover:bg-white hover:border-blue-100 transition-all duration-300 shadow-inner hover:shadow-xl">
                <div className="flex items-center gap-6 overflow-hidden">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"><FileText size={32} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate pr-4 uppercase tracking-tight">{studentData.proposal.file_path?.split('/').pop() || "Berkas Belum Diunggah"}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Status: Final Draft</p>
                  </div>
                </div>
                {fileUrl ? (
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-6 md:mt-0 flex items-center gap-3 px-8 py-3.5 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95 uppercase tracking-widest shrink-0">
                    <Download size={18} /> Lihat PDF
                  </a>
                ) : (
                  <div className="mt-6 md:mt-0 px-8 py-3.5 bg-slate-100 text-slate-300 text-xs font-black rounded-2xl uppercase tracking-widest cursor-not-allowed border border-slate-200">Berkas Kosong</div>
                )}
              </div>
            </div>
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