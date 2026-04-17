"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  User, 
  XCircle, 
  BadgeCheck,
  History,
  Clock,
  BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= FETCHER SWR =================
const fetchDetailBursaData = async (dosenId: string | null) => {
  if (!dosenId) return null;

  // 1. Fetch Profil (Avatar)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", dosenId)
    .single();

  // 2. Fetch Data Bimbingan (thesis_supervisors)
  const { data: supsData, error: supsError } = await supabase
    .from("thesis_supervisors")
    .select(`
      status,
      role,
      proposal_id, 
      rejection_reason,
      proposal:proposals (
        id,
        judul,
        status, 
        status_lulus,
        created_at,
        mahasiswa:profiles ( nama, npm )
      )
    `)
    .eq("dosen_id", dosenId);

  if (supsError) throw supsError;

  // 3. Fetch Data Antrean Bursa (proposal_recommendations)
  const { data: recsData, error: recsError } = await supabase
    .from("proposal_recommendations")
    .select(`
      tipe,
      proposal_id, 
      proposal:proposals (
        judul,
        status,
        mahasiswa:profiles ( nama, npm )
      )
    `)
    .eq("dosen_id", dosenId);

  if (recsError) throw recsError;

  return {
    dosenAvatar: profileData?.avatar_url || null,
    supervisors: supsData || [],
    peminat: recsData || []
  };
};

export default function DetailManajemenBursa() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const dosenId = searchParams.get("id"); 
  const dosenNama = searchParams.get("nama");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading } = useSWR(
    dosenId ? `detail_bursa_${dosenId}` : null,
    () => fetchDetailBursaData(dosenId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const dosenAvatar = cache?.dosenAvatar || null;
  const supervisors = cache?.supervisors || [];
  const peminat = cache?.peminat || [];

  // 🔥 FILTER DATA (LOGIKA BARU SESUAI WORKFLOW) 🔥

  // 1. Bimbingan Aktif: 
  const bimbinganAktif = supervisors.filter((s: any) => { // <-- Tambahkan : any di sini
    const p = s.proposal;
    const isLulus = p?.status_lulus === true || p?.status === "Lulus";
    return !isLulus && (
      s.status === "active" || 
      (s.status === "accepted" && p?.status === "Diterima")
    );
  });

  // 2. Riwayat Penolakan:
  const riwayatKeputusan = supervisors.filter((s: any) => s.status === "rejected"); // <-- Tambahkan : any di sini

  // 3. Antrean Bursa (Gabungan 2 Tipe):
  const antreanDisetujuiDosen = supervisors.filter((s: any) => // <-- Tambahkan : any di sini
    s.status === "accepted" && s.proposal?.status !== "Diterima"
  );
  
  const processedProposalIds = supervisors.map(s => s.proposal_id);
  const antreanBelumDijawab = peminat.filter(p => !processedProposalIds.includes(p.proposal_id));

  const antreanGabungan = [
  ...antreanDisetujuiDosen.map((s: any) => ({
    id: s.proposal_id,
    badge: s.role === "utama" ? "P1" : "P2",
    nama: s.proposal?.mahasiswa?.nama,
    npm: s.proposal?.mahasiswa?.npm,
    label: "Disetujui Dosen (Menunggu Kaprodi)",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50/50 border-emerald-100/50"
  })),
  ...antreanBelumDijawab.map((p: any) => ({
    id: p.proposal_id,
    badge: p.tipe === "pembimbing1" ? "P1" : "P2",
    nama: p.proposal?.mahasiswa?.nama,
    npm: p.proposal?.mahasiswa?.npm,
    label: "Menunggu Jawaban Dosen",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50/50 border-blue-100/50"
  }))
];

  if (isLoading && !cache) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-10 font-sans text-slate-700">
      <div className="max-w-7xl mx-auto">
        
        {/* TOMBOL KEMBALI */}
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
        >
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
            Kembali ke Monitoring
          </span>
        </button>

        {/* PROFIL DOSEN HEADER */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 border border-white mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-50 border border-slate-200 rounded-[2rem] flex items-center justify-center text-blue-600 shadow-xl relative overflow-hidden shrink-0">
              {dosenAvatar ? (
                <Image 
                  src={dosenAvatar} 
                  alt={dosenNama || "Profil Dosen"} 
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-3xl font-black uppercase">
                  {dosenNama ? dosenNama.charAt(0) : <User size={40} />}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Dosen Pembimbing</p>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                {dosenNama}
              </h1>
            </div>
          </div>
          <div className="bg-emerald-50 px-8 py-4 rounded-[1.5rem] border border-emerald-100 text-center shadow-inner">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Bimbingan Aktif</p>
            <p className="text-2xl font-black text-emerald-700">{bimbinganAktif.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM 1: DAFTAR MAHASISWA BIMBINGAN AKTIF */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-4">
              <BadgeCheck className="text-emerald-500" size={20} />
              <h2 className="text-lg font-black text-slate-800 tracking-tighter">Bimbingan Aktif</h2>
            </div>
            <div className="space-y-4">
             {bimbinganAktif.map((s: any, i: number) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-white shadow-lg shadow-slate-200/30">
                  <h3 className="font-black text-slate-800 text-sm leading-tight">
                    {s.proposal?.mahasiswa?.nama}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">
                    {s.proposal?.mahasiswa?.npm}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="flex gap-2 items-start text-slate-500">
                      <BookOpen size={14} className="mt-0.5 shrink-0" />
                      <p className="text-[10px] font-medium leading-relaxed line-clamp-2">
                        {s.proposal?.judul}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {bimbinganAktif.length === 0 && <EmptyState text="Tidak ada bimbingan aktif" />}
            </div>
          </div>

          {/* KOLOM 2: ANTREAN BURSA */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-4">
              <Clock className="text-blue-500" size={20} />
              <h2 className="text-lg font-black text-slate-800 tracking-tighter">Antrean Bursa</h2>
            </div>
            <div className="space-y-4">
              {antreanGabungan.map((item, i) => (
                <div key={i} className={`p-6 rounded-[2rem] border shadow-sm relative ${item.bgColor}`}>
                  <div className="absolute right-4 top-4">
                     <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase italic shadow-md">
                       {item.badge}
                     </span>
                  </div>
                  <h3 className="font-black text-slate-800 text-sm leading-tight">
                    {item.nama}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black mt-1 uppercase">
                    {item.npm}
                  </p>
                  <p className={`text-[9px] font-bold mt-2 uppercase italic tracking-widest ${item.textColor}`}>
                    {item.label}
                  </p>
                </div>
              ))}
              {antreanGabungan.length === 0 && <EmptyState text="Tidak ada antrean bursa" />}
            </div>
          </div>

          {/* KOLOM 3: RIWAYAT PENOLAKAN */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-4">
              <History className="text-slate-400" size={20} />
              <h2 className="text-lg font-black text-slate-800 tracking-tighter">Riwayat Penolakan</h2>
            </div>
            <div className="space-y-4">
              {riwayatKeputusan.map((s: any, i: number) => (
                <div key={i} className="bg-white p-5 rounded-[2rem] border border-red-50 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-700 text-[11px] leading-tight">
                        {s.proposal?.mahasiswa?.nama}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {s.proposal?.created_at ? new Date(s.proposal.created_at).toLocaleDateString("id-ID") : "-"}
                      </p>
                    </div>
                    <div className="bg-red-50 text-red-500 p-2 rounded-xl shrink-0">
                      <XCircle size={16} />
                    </div>
                  </div>
                  <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">
                      Alasan Dosen:
                    </p>
                    <p className="text-[10px] font-medium text-red-600 italic leading-relaxed">
                      "{s.rejection_reason || 'Tidak ada alasan spesifik'}"
                    </p>
                  </div>
                </div>
              ))}
              {riwayatKeputusan.length === 0 && <EmptyState text="Belum ada riwayat" />}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{text}</p>
    </div>
  );
}