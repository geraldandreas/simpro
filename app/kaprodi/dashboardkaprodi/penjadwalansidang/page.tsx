"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, Bell, Calendar, Clock, MapPin, 
  Search, ShieldCheck, User, FileText, ChevronDown 
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface DosenOption {
  id: string;
  nama: string;
}

export default function PenjadwalanSidangPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const seminarRequestId = searchParams.get("id");
  // ID Revisi didapatkan langsung dari URL untuk mempercepat loading
  const urlRevisionId = searchParams.get("rev");

  const [data, setData] = useState<any>(null);
  const [lecturers, setLecturers] = useState<DosenOption[]>([]);
  const [revisionId, setRevisionId] = useState<string | null>(urlRevisionId);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);

  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seminarRequestId) return;

    const loadData = async () => {
      try {
        /** 1️⃣ AMBIL DATA MAHASISWA & PROPOSAL **/
        const { data: seminar, error: semErr } = await supabase
          .from("seminar_requests")
          .select(`
            id,
            proposal:proposals (
              id, judul,
              user:profiles (nama, npm),
              supervisors:thesis_supervisors (
                role,
                dosen:profiles(nama)
              )
            )
          `)
          .eq("id", seminarRequestId)
          .single();

        if (semErr || !seminar) throw new Error("Data seminar tidak ditemukan");

        /** 2️⃣ VALIDASI REVISI (Gunakan ID dari URL atau cari ulang jika gagal) **/
        if (!revisionId) {
          const { data: revision } = await supabase
            .from("seminar_revisions")
            .select("id")
            .eq("seminar_request_id", seminarRequestId)
            .maybeSingle();
          
          if (revision) {
            setRevisionId(revision.id);
          } else {
            // Logika toleran: Jika benar-benar tidak ada di URL dan DB, baru berikan pesan
            alert("ID Perbaikan Seminar tidak terdeteksi. Pastikan mahasiswa sudah mengunggah berkas.");
            router.push("/kaprodi/dashboardkaprodi/pengajuansidang");
            return;
          }
        }

        /** 2 ambil data sidang request **/
  
          const { data: existingSidang } = await supabase
            .from("sidang_requests")
            .select(`id, 
              tanggal_sidang, 
              jam_sidang, 
              ruangan, 
              penguji1:sidang_requests_penguji1_fkey!inner(id), 
              penguji2:sidang_requests_penguji2_fkey!inner(id)`)
            .eq("seminar_request_id", seminarRequestId)
            .maybeSingle();

           

          if (existingSidang) {
            setTanggal(existingSidang.tanggal_sidang);
            setJam(existingSidang.jam_sidang);
            setRuangan(existingSidang.ruangan);
            setPenguji1(existingSidang.penguji1?.id || "");
            setPenguji2(existingSidang.penguji2?.id || "");
            setAlreadyScheduled(true);
          } 
        

        /** 3️⃣ AMBIL DAFTAR DOSEN UNTUK PENGUJI **/
        const { data: dosenData } = await supabase
          .from("profiles")
          .select("id, nama")
          .eq("role", "dosen")
          .order("nama");

        setLecturers(dosenData || []);
        setData(seminar);

      } catch (err: any) {
        console.error(err);
        router.push("/kaprodi/dashboardkaprodi/pengajuansidang");
      }

      
    };

    

    loadData();
  }, [seminarRequestId, revisionId, router]);

  const handleSubmit = async () => {
  // 1. Validasi awal
  if (!tanggal || !jam || !ruangan || !penguji1 || !penguji2) {
    alert("Harap lengkapi semua form.");
    return;
  }

  
  setLoading(true);

  try {
    /** 2. GUNAKAN INSERT (BUKAN UPSERT) **/
    // Karena onConflict dihapus, kita pakai insert biasa
    const { error: sidangErr } = await supabase.from("sidang_requests").update({
      // proposal_id: data.proposal.id,
      // seminar_request_id: data.id,
      // seminar_revision_id: revisionId,
      tanggal_sidang: tanggal,
      jam_sidang: jam,
      ruangan: ruangan,
      penguji1: penguji1,
      penguji2: penguji2,
      status: "Disetujui" // D besar sesuai constraint
    })
    .eq("seminar_request_id", data.id);

    if (sidangErr) throw sidangErr;

    /** 3. UPDATE STATUS SEMINAR REQUEST **/
    await supabase
      .from("seminar_requests")
      .update({ status: "Siap Sidang" })
      .eq("id", data.id);

      setAlreadyScheduled(true);
    alert("✅ Jadwal sidang berhasil dikonfirmasi.");
    router.push("/kaprodi/dashboardkaprodi/pengajuansidang");
  } catch (err: any) {
    // Jika tetap error duplicate, berarti data memang sudah ada di DB
    alert("Gagal: " + err.message);
  } finally {
    setLoading(false);
  }
};
  if (!data) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F4F7FE]">
      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Menyelaraskan Data Akademik...</p>
    </div>
  );

  const sup = data.proposal.supervisors || [];
  const pemb1 = sup.find((s: any) => s.role === "utama")?.dosen?.nama || "-";
  const pemb2 = sup.find((s: any) => s.role === "pendamping")?.dosen?.nama || "-";

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700 uppercase tracking-tighter">
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

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-5 mb-10">
          <Link href="/kaprodi/dashboardkaprodi/pengajuansidang" className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Penjadwalan Sidang Akhir</h1>
            <p className="text-slate-500 font-medium mt-3 tracking-normal normal-case">Lengkapi rincian waktu dan dewan penguji untuk mahasiswa ini.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT: Identitas Mahasiswa */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] transition-opacity"><User size={180} /></div>
              <div className="flex items-center gap-8 relative z-10 mb-10">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shrink-0 overflow-hidden">
                  <User size={56} className="text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">{data.proposal.user.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-4 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">
                    {data.proposal.user.npm}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic font-bold text-slate-600 text-lg leading-relaxed normal-case">
                "{data.proposal.judul}"
              </div>
              <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Pembimbing Utama</p>
                  <p className="font-bold text-slate-800 uppercase tracking-tight">{pemb1}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Pembimbing Pendamping</p>
                  <p className="font-bold text-slate-800 uppercase tracking-tight">{pemb2}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Form Jadwal & Penguji */}
          <div className="lg:col-span-4 space-y-8 sticky top-28 uppercase">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 overflow-hidden">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3 border-b border-slate-50 pb-6 leading-none">
                <Calendar size={18} className="text-indigo-600" /> Waktu Sidang
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hari & Tanggal</label>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:border-blue-400 disabled:bg-white disabled:text-slate-400 transition-all shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jam</label>
                    <input type="time" value={jam} onChange={e => setJam(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold disabled:bg-white disabled:text-slate-400 text-sm shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ruangan</label>
                    <input type="text" placeholder="E-201" value={ruangan} onChange={e => setRuangan(e.target.value)} disabled={alreadyScheduled}  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none disabled:bg-white disabled:text-slate-400 font-bold text-sm shadow-inner" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 overflow-hidden" >
              <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3 border-b border-slate-50 pb-6 leading-none">
                <ShieldCheck size={18} className="text-amber-500" /> Dewan Penguji
              </h3>
              <div className="space-y-6" >
                {[
                  { val: penguji1, set: setPenguji1, label: "Penguji Utama" },
                  { val: penguji2, set: setPenguji2, label: "Penguji Anggota" }
                ].map((p, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{p.label}</label>
                    <div className="relative group">
                      <select value={p.val} onChange={e => p.set(e.target.value)} disabled={alreadyScheduled} className="w-full bg-slate-50 border border-slate-200 py-4 px-5 rounded-2xl outline-none font-bold text-sm focus:border-blue-400 cursor-pointer disabled:bg-white disabled:text-slate-400 appearance-none shadow-inner uppercase">
                        <option value="">-- Pilih Dosen --</option>
                        {lecturers.map(lec => <option key={lec.id} value={lec.id}>{lec.nama}</option>)}
                      </select>
                       {!alreadyScheduled && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={handleSubmit}
                  disabled={loading || alreadyScheduled}
                  className={`w-full mt-4 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3
                    ${alreadyScheduled
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}
                  `}
                >
                  {alreadyScheduled ? (
                                      <><ShieldCheck size={18} /> Jadwal Terkonfirmasi</>
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