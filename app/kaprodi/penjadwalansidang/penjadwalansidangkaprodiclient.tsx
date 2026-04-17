"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import NotificationBell from '@/components/notificationBell';
import Image from "next/image"; 
import { 
  ArrowLeft, Bell, Calendar, Clock, MapPin, 
  Search, ShieldCheck, User, FileText, ChevronDown, Download 
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
  dosen_id: string; 
  dosen: {
    nama: string;
    avatar_url?: string | null; 
  };
}

interface Document {
  nama_dokumen: string;
  file_url: string;
}

interface StudentDataProps {
  id: string;
  revisionFile: string | null;
  proposal: {
    id: string;
    judul: string;
    file_path: string;
    user_id: string;
    user: {
      id: string;
      nama: string;
      npm: string;
      avatar_url?: string | null; 
    };
    supervisors: Supervisor[];
  };
}

// ================= FETCHER SWR =================
const fetchJadwalSidangData = async (seminarRequestId: string | null) => {
  if (!seminarRequestId) return null;

  // 1. Ambil Data Seminar & Proposal
  const { data: seminar, error: semErr } = await supabase
    .from("seminar_requests")
    .select(`
      id,
      proposal:proposals (
        id, judul, user_id,
        user:profiles (id, nama, npm, avatar_url), 
        supervisors:thesis_supervisors (role, dosen:profiles(nama))
      )
    `)
    .eq("id", seminarRequestId)
    .single();

  if (semErr || !seminar) throw new Error("Data seminar tidak ditemukan");

  const proposalId = (seminar.proposal as any)?.id;
  if (!proposalId) throw new Error("ID Proposal tidak ditemukan");

  // 2. Ambil File Skripsi Final
  const { data: sidangDoc } = await supabase
    .from("sidang_documents_verification")
    .select("file_url")
    .eq("proposal_id", proposalId)
    .eq("nama_dokumen", "file_skripsi_final")
    .eq("status", "Lengkap")
    .maybeSingle();

  // 3. Ambil Daftar Dosen
  const { data: dosenData } = await supabase
    .from("profiles")
    .select("id, nama")
    .in("role", ["dosen", "kaprodi"])
    .order("nama");

  // 4. Ambil Jadwal Sidang & Riwayat Penguji
  const [ { data: existingSidang }, { data: riwayatPenguji } ] = await Promise.all([
    supabase.from("sidang_requests").select(`id, status, tanggal_sidang, jam_sidang, ruangan, penguji1, penguji2, penguji3`).eq("seminar_request_id", seminarRequestId).maybeSingle(),
    supabase.from("examiners").select("dosen_id, role").eq("seminar_request_id", seminarRequestId)
  ]);

  let defaultP1 = "";
  let defaultP2 = "";
  let defaultP3 = "";

  if (riwayatPenguji) {
    defaultP1 = riwayatPenguji.find(p => p.role === 'penguji1' || p.role === 'utama')?.dosen_id || "";
    defaultP2 = riwayatPenguji.find(p => p.role === 'penguji2' || p.role === 'anggota1')?.dosen_id || "";
    defaultP3 = riwayatPenguji.find(p => p.role === 'penguji3' || p.role === 'anggota2')?.dosen_id || "";
  }

  const finalData: StudentDataProps = {
    id: seminar.id,
    revisionFile: sidangDoc?.file_url || null,
    proposal: Array.isArray(seminar.proposal) ? seminar.proposal[0] : seminar.proposal as any
  };

  return {
    studentData: finalData,
    lecturers: (dosenData || []) as DosenOption[],
    existingSidang: existingSidang || null,
    initialPenguji: { p1: defaultP1, p2: defaultP2, p3: defaultP3 }
  };
};

export default function PenjadwalanSidangKaprodiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seminarRequestId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    seminarRequestId ? `penjadwalan_sidang_${seminarRequestId}` : null,
    () => fetchJadwalSidangData(seminarRequestId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const data = cache?.studentData || null;
  const lecturers = cache?.lecturers || [];

  // --- LOCAL STATE (Sync from Cache) ---
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);
  const [penguji1, setPenguji1] = useState("");
  const [penguji2, setPenguji2] = useState("");
  const [penguji3, setPenguji3] = useState(""); 
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cache) {
      if (cache.existingSidang) {
        const isLocked = cache.existingSidang.status !== "menunggu_penjadwalan";
        setAlreadyScheduled(isLocked);
        setTanggal(cache.existingSidang.tanggal_sidang || "");
        setJam(cache.existingSidang.jam_sidang || "");
        setRuangan(cache.existingSidang.ruangan || "");
        setPenguji1(cache.existingSidang.penguji1 || cache.initialPenguji.p1);
        setPenguji2(cache.existingSidang.penguji2 || cache.initialPenguji.p2);
        setPenguji3(cache.existingSidang.penguji3 || cache.initialPenguji.p3);
      } else {
        setAlreadyScheduled(false);
        setPenguji1(cache.initialPenguji.p1);
        setPenguji2(cache.initialPenguji.p2);
        setPenguji3(cache.initialPenguji.p3);
      }
    }
  }, [cache]);

  // 🔥 Handler View File
  const handleViewFile = async (rawPath: string) => {
    if (!rawPath) return;
    try {
      const bucketName = 'docseminar'; 
      let cleanPath = rawPath.replace(`${bucketName}/`, "");
      if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

      const { data: signedData, error } = await supabase.storage
        .from(bucketName) 
        .createSignedUrl(cleanPath, 3600);

      if (error || !signedData?.signedUrl) {
        throw new Error("Gagal generate link");
      }
      window.open(signedData.signedUrl, '_blank');
    } catch (err) {
      alert("Gagal membuka berkas. Pastikan file tersedia di storage.");
    }
  };

  /** --- HANDLERS --- **/
  const handleSubmit = async () => {
    if (!data) return;
    if (!tanggal || !jam || !ruangan || !penguji1 || !penguji2 || !penguji3) {
      alert("Harap lengkapi semua form waktu dan pastikan ketiga dosen penguji terisi.");
      return;
    }
    
    if (penguji1 === penguji2 || penguji1 === penguji3 || penguji2 === penguji3) {
      alert("Dosen Penguji tidak boleh orang yang sama.");
      return;
    }

    setLoading(true);

    try {
      const { error: sidangErr } = await supabase
        .from("sidang_requests")
        .upsert({
          seminar_request_id: data.id,       
          proposal_id: data.proposal.id,     
          tanggal_sidang: tanggal,
          jam_sidang: jam,
          ruangan: ruangan,
          penguji1: penguji1,
          penguji2: penguji2,
          penguji3: penguji3, 
          status: "dijadwalkan"              
        }, { onConflict: 'seminar_request_id' });

      if (sidangErr) throw sidangErr;

      await supabase
        .from("seminar_requests")
        .update({ status: "Siap Sidang" })
        .eq("id", data.id);

      const formattedDate = new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const mhsName = data.proposal?.user?.nama || "Seorang Mahasiswa";

      // 1. KIRIM NOTIFIKASI KE MAHASISWA
      const studentId = data.proposal?.user?.id;
      if (studentId) {
        await sendNotification(studentId, "Jadwal Sidang Skripsi", `Jadwal sidang Anda ditetapkan pada ${formattedDate} pukul ${jam} WIB di ${ruangan}.`);
      }

      // 2. KIRIM NOTIFIKASI KE KETIGA DOSEN PENGUJI
      const dosenIds = [penguji1, penguji2, penguji3];
      for (const dId of dosenIds) {
        if (dId) {
          await sendNotification(dId, "Tugas Menguji Sidang Skripsi", `Anda ditugaskan sebagai Penguji Sidang untuk mahasiswa ${mhsName} pada ${formattedDate} pukul ${jam} WIB di ${ruangan}.`);
        }
      }

      setAlreadyScheduled(true);
      alert("✅ Jadwal sidang berhasil dikonfirmasi dan dikirim ke seluruh pihak terkait.");
      mutate(); // 🔥 Refresh SWR State
      router.push("/kaprodi/pengajuansidang");
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= UI RENDER =================
  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC] w-full z-50 outline-none focus:outline-none">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const sup = data.proposal.supervisors || [];
  const pemb1 = sup.find((s: any) => s.role === "utama")?.dosen?.nama || "-";
  const pemb2 = sup.find((s: any) => s.role === "pendamping")?.dosen?.nama || "-";

  const syaratTercapai = true; 

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-700 tracking-tighter outline-none focus:outline-none">
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full outline-none focus:outline-none">
         <div className="mb-10">
          <Link href="/kaprodi/pengajuansidang" className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
              Kembali ke Pengajuan Sidang
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 outline-none focus:outline-none">
          {/* LEFT PANEL */}
          <div className="lg:col-span-8 space-y-8 outline-none focus:outline-none">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10 relative overflow-hidden group outline-none focus:outline-none">
              
              <div className="flex items-center gap-8 relative z-10 mb-10 outline-none focus:outline-none">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shrink-0 relative overflow-hidden outline-none focus:outline-none">
                  {data.proposal.user.avatar_url ? (
                    <Image src={data.proposal.user.avatar_url} alt="Profil" layout="fill" objectFit="cover" />
                  ) : (
                    <User size={56} className="text-slate-300" />
                  )}
                </div>
                <div className="outline-none focus:outline-none">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none capitalize">{data.proposal.user.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-4 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit uppercase">{data.proposal.user.npm}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 font-bold text-slate-600 text-lg leading-relaxed normal-case mb-6 outline-none focus:outline-none">
                "{data.proposal.judul}"
              </div>

              {data.revisionFile && (
                <div className="flex items-center justify-between p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] group hover:bg-emerald-50 transition-all shadow-sm outline-none focus:outline-none">
                  <div className="flex items-center gap-5 outline-none focus:outline-none">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:rotate-6 transition-transform outline-none focus:outline-none">
                      <FileText size={28} />
                    </div>
                    <div className="outline-none focus:outline-none">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none mb-2">Draft Skripsi Final (Verified)</p>
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[250px] normal-case">{data.revisionFile.split('/').pop()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewFile(data.revisionFile as string)}
                    className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-emerald-600 hover:text-white text-emerald-600 text-[10px] font-black rounded-2xl transition-all shadow-sm border border-emerald-100 uppercase tracking-widest outline-none focus:outline-none"
                  >
                    <Download size={14} className="mr-1" /> Lihat Berkas
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-slate-100 outline-none focus:outline-none">
                <div className="outline-none focus:outline-none">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Pembimbing Utama</p>
                  <p className="font-bold text-slate-800 capitalize tracking-tight">{pemb1}</p>
                </div>
                <div className="outline-none focus:outline-none">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Pembimbing Pendamping</p>
                  <p className="font-bold text-slate-800 capitalize tracking-tight">{pemb2}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL (WAKTU & PENGUJI) */}
          <div className="lg:col-span-4 space-y-8 uppercase outline-none focus:outline-none">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 overflow-hidden outline-none focus:outline-none">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3 border-b border-slate-50 pb-6 leading-none outline-none focus:outline-none">
                <Calendar size={18} className="text-indigo-600" /> Waktu Sidang
              </h3>
              <div className="space-y-6 outline-none focus:outline-none">
                <div className="space-y-2 outline-none focus:outline-none">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 outline-none focus:outline-none">Hari & Tanggal</label>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:border-blue-400 shadow-inner normal-case" />
                </div>
                <div className="grid grid-cols-2 gap-4 outline-none focus:outline-none">
                  <div className="space-y-2 outline-none focus:outline-none">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 outline-none focus:outline-none">Jam</label>
                    <input type="time" value={jam} onChange={e => setJam(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-inner normal-case" />
                  </div>
                  <div className="space-y-2 outline-none focus:outline-none">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 outline-none focus:outline-none">Ruangan</label>
                    <input type="text" placeholder="E-201" value={ruangan} onChange={e => setRuangan(e.target.value)} disabled={alreadyScheduled} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-inner normal-case" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 overflow-hidden outline-none focus:outline-none" >
              <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3 border-b border-slate-50 pb-6 leading-none outline-none focus:outline-none">
                <ShieldCheck size={18} className="text-amber-500" /> Dewan Penguji
              </h3>
              <div className="space-y-6 outline-none focus:outline-none" >
                {[
                  { val: penguji1, set: setPenguji1, label: "Penguji 1" },
                  { val: penguji2, set: setPenguji2, label: "Penguji 2" },
                  { val: penguji3, set: setPenguji3, label: "Penguji 3" }
                ].map((p, idx) => (
                  <div key={idx} className="space-y-2 outline-none focus:outline-none">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 outline-none focus:outline-none">{p.label}</label>
                    <div className="relative group outline-none focus:outline-none">
                      <select value={p.val} onChange={e => p.set(e.target.value)} disabled={alreadyScheduled} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-4 px-5 pr-12 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all cursor-pointer shadow-inner capitalize">
                        <option value="" className="normal-case">-- Pilih Dosen --</option>
                        {lecturers.map(lec => <option key={lec.id} value={lec.id} className="capitalize">{lec.nama}</option>)}
                      </select>
                       {!alreadyScheduled && <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none outline-none focus:outline-none" size={18} />}
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={handleSubmit}
                  disabled={loading || alreadyScheduled || !syaratTercapai}
                  className={`w-full mt-4 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 outline-none focus:outline-none focus:ring-0
                    ${alreadyScheduled 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-not-allowed'
                      : !syaratTercapai
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
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