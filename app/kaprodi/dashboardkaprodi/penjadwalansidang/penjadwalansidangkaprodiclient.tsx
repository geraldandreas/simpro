"use client";

import React, { useEffect, useState } from "react";
import NotificationBell from '@/components/notificationBell';
import { 
  ArrowLeft, Bell, Calendar, Clock, MapPin, 
  Search, ShieldCheck, User, FileText, ChevronDown, Download 
} from "lucide-react";
import Link from "next/link";
import { sendNotification } from "@/lib/notificationUtils";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface DosenOption {
  id: string;
  nama: string;
}

export default function PenjadwalanSidangKaprodiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const seminarRequestId = searchParams.get("id");
  const [data, setData] = useState<any>(null);
  const [lecturers, setLecturers] = useState<DosenOption[]>([]);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);

  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [loading, setLoading] = useState(false);
  

  // 🔥 Handler View File
const handleViewFile = async (rawPath: string) => {
  if (!rawPath) return;
  try {
    const bucketName = 'seminar_perbaikan';
    
    // Membersihkan path: Menghapus nama bucket dan slash awal jika ada
    // Misal: "seminar_perbaikan/folder/file.pdf" menjadi "folder/file.pdf"
    let cleanPath = rawPath.replace(`${bucketName}/`, "");
    
    // Hapus slash di paling depan jika masih ada
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

    const { data: signedData, error } = await supabase.storage
      .from(bucketName) 
      .createSignedUrl(cleanPath, 3600);

    if (error || !signedData?.signedUrl) {
      console.error("Storage Error Detail:", error);
      throw new Error("Gagal generate link");
    }
    
    window.open(signedData.signedUrl, '_blank');
  } catch (err) {
    console.error("View File Error:", err);
    alert("Gagal membuka berkas. Pastikan file tersedia di storage.");
  }
};

useEffect(() => {
  if (!seminarRequestId) return;

  const loadData = async () => {
    try {
      const urlRevisionId = searchParams.get("rev");

      // 1. Ambil Data Seminar & Proposal
      const { data: seminar, error: semErr } = await supabase
        .from("seminar_requests")
        .select(`
          id,
          proposal:proposals (
            id, judul,
            user:profiles (id, nama, npm),
            supervisors:thesis_supervisors (role, dosen:profiles(nama))
          )
        `)
        .eq("id", seminarRequestId)
        .single();

      if (semErr || !seminar) throw new Error("Data seminar tidak ditemukan");

      // 2. Ambil Data Revisi (LOGIKA TUNGGAL)
      let revisionQuery = supabase.from("seminar_revisions").select("id, file_path");
      
      if (urlRevisionId) {
        revisionQuery = revisionQuery.eq("id", urlRevisionId);
      } else {
        revisionQuery = revisionQuery
          .eq("seminar_request_id", seminarRequestId)
          .order("created_at", { ascending: false })
          .limit(1);
      }
      const { data: revision } = await revisionQuery.maybeSingle();

      // 3. Ambil Jadwal Sidang
      // Di dalam useEffect -> loadData
const { data: existingSidang } = await supabase
  .from("sidang_requests")
  .select(`id, status, tanggal_sidang, jam_sidang, ruangan, 
    penguji1:sidang_requests_penguji1_fkey(id), 
    penguji2:sidang_requests_penguji2_fkey(id)`)
  .eq("seminar_request_id", seminarRequestId)
  .maybeSingle();

if (existingSidang) {
  // 🔥 KUNCI UTAMA: Form TERKUNCI hanya jika statusnya BUKAN 'menunggu_penjadwalan'
  // Jika statusnya 'menunggu_penjadwalan', isLocked akan FALSE, sehingga form TERBUKA.
  const isLocked = existingSidang.status !== "menunggu_penjadwalan";
  setAlreadyScheduled(isLocked);

  // Masukkan data ke input (jika Kaprodi sudah pernah isi draft tapi belum konfirmasi)
  setTanggal(existingSidang.tanggal_sidang || "");
  setJam(existingSidang.jam_sidang || "");
  setRuangan(existingSidang.ruangan || "");
  
  const sid = existingSidang as any;
  setPenguji1(sid.penguji1?.id || "");
  setPenguji2(sid.penguji2?.id || "");
} else {
  // Jika baris data sama sekali belum ada
  setAlreadyScheduled(false);
}

      // 4. Ambil Daftar Dosen
      const { data: dosenData } = await supabase.from("profiles").select("id, nama").eq("role", "dosen").order("nama");
      setLecturers(dosenData || []);

      // 🔥 SET DATA SEKALI SAJA (Kunci agar tombol muncul)
      setData({
        ...seminar,
        revisionFile: revision?.file_path || null,
        revisionId: revision?.id || null
      });

    } catch (err: any) {
      console.error("Load Error:", err.message);
    }
  };

  loadData();
}, [seminarRequestId]);

  /** --- HANDLERS --- **/

  const handleSubmit = async () => {
  if (!tanggal || !jam || !ruangan || !penguji1 || !penguji2) {
    alert("Harap lengkapi semua form.");
    return;
  }
  setLoading(true);

  try {
    // 🔥 PERBAIKAN: Sertakan proposal_id dan seminar_revision_id agar tidak NULL
    const { error: sidangErr } = await supabase
      .from("sidang_requests")
      .upsert({
        seminar_request_id: data.id,       // ID Utama untuk ON CONFLICT
        proposal_id: data.proposal.id,     // WAJIB ADA (Sesuai error not-null)
        seminar_revision_id: data.revisionId, // Disarankan ada
        tanggal_sidang: tanggal,
        jam_sidang: jam,
        ruangan: ruangan,
        penguji1: penguji1,
        penguji2: penguji2,
        status: "dijadwalkan"              // Pengunci status
      }, { onConflict: 'seminar_request_id' });

    if (sidangErr) throw sidangErr;

    // Update status seminar utama menjadi Siap Sidang
    await supabase
      .from("seminar_requests")
      .update({ status: "Siap Sidang" })
      .eq("id", data.id);
      // Notifikasi ke mahasiswa
      const studentId = data.proposal?.user?.id;
      if (studentId) {
        const formattedDate = new Date(tanggal).toLocaleDateString('id-ID', { 
          day: 'numeric', month: 'long', year: 'numeric' 
        });
        await sendNotification(
          studentId,
          "Jadwal Sidang Skripsi",
          `Jadwal sidang Anda ditetapkan pada ${formattedDate} pukul ${jam} WIB di ${ruangan}.`
        );
      }

      setAlreadyScheduled(true);
    alert("✅ Jadwal sidang berhasil dikonfirmasi dan dikunci.");
    router.push("/kaprodi/dashboardkaprodi/pengajuansidang");
  } catch (err: any) {
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

  const syaratTercapai =  !!data?.revisionFile;

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700 uppercase tracking-tighter">
      {/* HEADER */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-6"></div>
        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">Simpro</span>
        </div>
      </header>
    
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-5 mb-10">
          <Link href="/kaprodi/dashboardkaprodi/pengajuansidang" className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Penjadwalan Sidang Akhir</h1>
            <p className="text-slate-500 font-medium mt-3 tracking-normal normal-case">Lengkapi rincian waktu dan dewan penguji untuk mahasiswa ini.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT PANEL */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10 relative overflow-hidden group">
              <div className="flex items-center gap-8 relative z-10 mb-10">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shrink-0">
                  <User size={56} className="text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">{data.proposal.user.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-4 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">{data.proposal.user.npm}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic font-bold text-slate-600 text-lg leading-relaxed normal-case mb-6">
                "{data.proposal.judul}"
              </div>

              {/* TAMPILAN FILE DARI BUCKET seminar_perbaikan */}
              {data.revisionFile && (
                <div className="flex items-center justify-between p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] group hover:bg-emerald-50 transition-all shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:rotate-6 transition-transform">
                      <FileText size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none mb-2">Berkas Perbaikan Seminar</p>
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[250px] normal-case">{data.revisionFile.split('/').pop()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewFile(data.revisionFile)}
                    className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-emerald-600 hover:text-white text-emerald-600 text-[10px] font-black rounded-2xl transition-all shadow-sm border border-emerald-100 uppercase tracking-widest"
                  >
                    <Download size={14} className="mr-1" /> Lihat Berkas
                  </button>
                </div>
              )}

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

          {/* RIGHT PANEL (WAKTU & PENGUJI) */}
          <div className="lg:col-span-4 space-y-8 sticky top-28 uppercase">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 overflow-hidden">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3 border-b border-slate-50 pb-6 leading-none">
                <Calendar size={18} className="text-indigo-600" /> Waktu Sidang
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hari & Tanggal</label>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:border-blue-400 shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jam</label>
                    <input type="time" value={jam} onChange={e => setJam(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ruangan</label>
                    <input type="text" placeholder="E-201" value={ruangan} onChange={e => setRuangan(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-inner" />
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
                      <select value={p.val} onChange={e => p.set(e.target.value)} disabled={alreadyScheduled} className="w-full bg-slate-50 border border-slate-200 py-4 px-5 rounded-2xl outline-none font-bold text-sm focus:border-blue-400 cursor-pointer shadow-inner uppercase appearance-none">
                        <option value="">-- Pilih Dosen --</option>
                        {lecturers.map(lec => <option key={lec.id} value={lec.id}>{lec.nama}</option>)}
                      </select>
                       {!alreadyScheduled && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />}
                    </div>
                  </div>
                ))}
                <button 
  onClick={handleSubmit}
  // Tombol mati jika: Sedang loading OR Sudah dijadwalkan OR Syarat belum lengkap
  disabled={loading || alreadyScheduled || !syaratTercapai}
  className={`w-full mt-4 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3
    ${alreadyScheduled 
      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none' 
      : !syaratTercapai
        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' // Warna abu-abu jika syarat kurang
        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}
  `}
>
  {alreadyScheduled ? (
    <><ShieldCheck size={18} /> Jadwal Terkonfirmasi</>
  ) : !syaratTercapai ? (
    "Syarat Belum Lengkap"
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