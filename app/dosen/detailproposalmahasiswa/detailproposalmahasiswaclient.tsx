"use client";

import React, { useState, Suspense } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import Link from "next/link";
import Image from "next/image";
import { 
  Search, 
  FileText, 
  ArrowLeft,
  CheckCircle,
  Info,
  Clock,
  XCircle
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ---------------- TYPES ----------------
interface Supervisor {
  id?: string;
  dosen_id: string;
  role: string;
  status: string;
  rejection_reason: string | null;
  dosen: { nama: string } | null;
}

interface ProposalDetail {
  id: string;
  judul: string;
  file_path: string | null;
  status: string;
  user: {
    id: string;
    nama: string | null;
    npm: string | null;
    avatar_url?: string | null;
  } | null;
}

export default function DetailProposalMahasiswaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DetailProposalDosenContent />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchDetailProposalDosen = async (proposalId: string | null) => {
  if (!proposalId) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id || null;

  // 1. Ambil Proposal Utama
  const { data: propData, error } = await supabase
    .from("proposals")
    .select(`id, judul, file_path, status, user:profiles ( id, nama, npm, avatar_url )`)
    .eq("id", proposalId)
    .maybeSingle();

  if (error) throw error;
  
  // Pastikan user tidak terbungkus dalam array tunggal (bug Supabase)
  const formattedProposal = {
    ...propData,
    user: Array.isArray((propData as any)?.user) ? (propData as any).user[0] : (propData as any)?.user
  } as ProposalDetail;

  // 2. Ambil data dari thesis_supervisors
  const { data: supervisors } = await supabase
    .from("thesis_supervisors")
    .select(`id, dosen_id, role, status, rejection_reason, dosen:profiles ( nama )`)
    .eq("proposal_id", proposalId);

  // 3. Ambil data dari proposal_recommendations
  const { data: recommendations } = await supabase
    .from("proposal_recommendations")
    .select(`dosen_id, tipe`)
    .eq("proposal_id", proposalId);

  // 4. Merge Bersih
  let displayList: any[] = supervisors ? [...supervisors] : [];

  if (recommendations && recommendations.length > 0) {
    recommendations.forEach(rec => {
      const isAlreadyProcessed = displayList.find(s => s.dosen_id === rec.dosen_id);
      if (!isAlreadyProcessed) {
        displayList.push({
          id: `temp-${rec.dosen_id}`,
          dosen_id: rec.dosen_id,
          role: rec.tipe === 'pembimbing1' ? 'utama' : 'pendamping',
          status: 'pending',
          rejection_reason: null,
          dosen: { nama: "Dosen" }
        });
      }
    });
  }

  // 5. Cek Respon Pribadi Dosen
  let myResponseData = null;
  if (userId) {
    const me = displayList.find((s) => s.dosen_id === userId);
    myResponseData = me || null;
  }

  return {
    proposal: formattedProposal,
    currentDosenId: userId,
    myResponseData
  };
};


function DetailProposalDosenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    proposalId ? `detail_proposal_dosen_${proposalId}` : null,
    () => fetchDetailProposalDosen(proposalId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const proposal = cache?.proposal || null;
  const currentDosenId = cache?.currentDosenId || null;
  const myResponseData = cache?.myResponseData || null;

  // --- LOCAL STATE ---
  const [openingPdf, setOpeningPdf] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ================= ACTIONS =================
  const handleResponse = async (isAccepted: boolean) => {
    if (!currentDosenId || !proposalId) return;
    
    if (!isAccepted && !rejectReason) {
      return alert("Harap masukkan alasan penolakan/pembatalan");
    }

    setIsSubmitting(true);
    try {
      const myRole = myResponseData?.role || 'utama';

      // 1. Cek DB untuk thesis_supervisors existing
      const { data: existing } = await supabase
        .from("thesis_supervisors")
        .select("id")
        .eq("proposal_id", proposalId)
        .eq("dosen_id", currentDosenId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("thesis_supervisors")
          .update({
            status: isAccepted ? "accepted" : "rejected",
            rejection_reason: isAccepted ? null : rejectReason
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("thesis_supervisors")
          .insert({
            proposal_id: proposalId,
            dosen_id: currentDosenId,
            role: myRole,
            status: isAccepted ? "accepted" : "rejected",
            rejection_reason: isAccepted ? null : rejectReason
          });
        if (error) throw error;
      }

      // 2. Ambil ID Kaprodi untuk Notifikasi
      const { data: kaprodi } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "kaprodi")
        .maybeSingle();

      const { data: profileDosen } = await supabase.from("profiles").select("nama").eq("id", currentDosenId).single();
      const dosenNama = profileDosen?.nama || "Dosen";
      const mhsNama = proposal?.user?.nama || "Mahasiswa";

      // 3. Notifikasi
      const notifications: any[] = [];
      if (kaprodi) {
        notifications.push({
          user_id: kaprodi.id,
          title: isAccepted ? "Persetujuan Pembimbing" : "Penolakan Pembimbing",
          message: isAccepted 
            ? `${dosenNama} TELAH SETUJU membimbing ${mhsNama}.` 
            : `${dosenNama} MENOLAK bimbingan ${mhsNama}. Alasan: ${rejectReason}`,
        });
      }
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      alert(isAccepted ? "Berhasil menyetujui topik" : "Berhasil menolak topik");
      setShowRejectModal(false);
      setRejectReason("");

      // 🔥 Memicu SWR untuk fetch ulang data di background
      mutate(); 
      
    } catch (err: any) {
      alert("Gagal memproses: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!proposal?.file_path) {
      alert("File tidak tersedia");
      return;
    }

    try {
      setOpeningPdf(true);
      const { data, error } = await supabase.storage
        .from("proposals") 
        .createSignedUrl(proposal.file_path, 3600); 

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        alert("Gagal membuka file");
      }
    } catch (err: any) {
      alert("Tidak bisa membuka file (akses ditolak / file tidak ditemukan)");
    } finally {
      setOpeningPdf(false);
    }
  };

  // ================= UI RENDER =================
  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FB]">
        <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6 shadow-inner relative overflow-hidden">
          <Search size={32} className="relative z-10" />
        </div>
        <h2 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Data Tidak Ditemukan</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs mb-8">
          Data proposal yang Anda cari tidak ada di sistem atau akses ditolak.
        </p>
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-4 transition-all active:scale-95"
        >
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
            Kembali ke Akses Proposal
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">

          <div className="mb-10">
            <button 
              onClick={() => router.back()}
              className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
            >
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
                Kembali ke Akses Proposal
              </span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl uppercase relative overflow-hidden shrink-0 border border-slate-200">
                  {proposal.user?.avatar_url ? (
                    <Image 
                      src={proposal.user.avatar_url} 
                      alt={proposal.user?.nama || "User"} 
                      layout="fill" 
                      objectFit="cover" 
                    />
                  ) : (
                    proposal.user?.nama?.charAt(0) || "?"
                  )}
                </div>
                
               <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-800 leading-none truncate tracking-tight mb-1">
                    {proposal.user?.nama}
                  </h2>
                  <p className="text-[11px] font-black text-slate-400 tracking-widest">
                    {proposal.user?.npm}
                  </p>
                </div>
              </div>
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Judul Proposal
                </h3>
                <p className="text-lg font-bold text-slate-800 leading-tight">
                  "{proposal.judul}"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {myResponseData ? (
                <div className={`rounded-2xl p-8 text-white shadow-xl transition-all duration-300 ${
                  myResponseData.status === 'accepted' 
                  ? 'bg-emerald-600 shadow-emerald-100' 
                  : myResponseData.status === 'rejected'
                  ? 'bg-red-600 shadow-red-100'
                  : 'bg-blue-600 shadow-blue-100'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {myResponseData.status === 'accepted' ? (
                      <CheckCircle size={28} className="text-emerald-200" />
                    ) : myResponseData.status === 'rejected' ? (
                      <XCircle size={28} className="text-red-200" />
                    ) : (
                      <Clock size={28} className="text-blue-200 animate-pulse" />
                    )}
                    <h3 className="text-lg font-bold">
                      {myResponseData.status === 'accepted' 
                        ? "Persetujuan Terkirim" 
                        : myResponseData.status === 'rejected'
                        ? "Penolakan Terkirim"
                        : "Konfirmasi Kesediaan Bimbingan"}
                    </h3>
                  </div>
                  
                  <p className="text-white/90 text-sm mb-6 leading-relaxed font-medium">
                    {myResponseData.status === 'accepted' ? (
                      `Anda telah menyetujui untuk menjadi Pembimbing ${myResponseData.role === 'utama' ? '1' : '2'} dari mahasiswa ini. Silakan tunggu konfirmasi akhir dari Kaprodi.`
                    ) : myResponseData.status === 'rejected' ? (
                      `Anda telah menolak untuk menjadi pembimbing mahasiswa ini dengan alasan: "${myResponseData.rejection_reason}".`
                    ) : (
                      `Anda diajukan sebagai Pembimbing ${myResponseData.role === 'utama' ? '1' : '2'}. Apakah Anda bersedia membimbing mahasiswa ini?`
                    )}
                  </p>
                  
                  {proposal.status === "Diterima" ? (
                    <div className="mt-6 p-4 bg-white/20 rounded-xl text-center border border-white/30 backdrop-blur-sm">
                      <div className="flex justify-center mb-2">
                        <CheckCircle size={24} className="text-white opacity-80" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-white">Penetapan Final Selesai</p>
                      <p className="text-xs mt-1 text-white/80 font-medium">Kaprodi telah melakukan penetapan final untuk proposal ini. Respon tidak dapat diubah lagi.</p>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {myResponseData.status !== 'accepted' && (
                        <button 
                          onClick={() => handleResponse(true)}
                          disabled={isSubmitting}
                          className="flex-1 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-md disabled:opacity-50"
                        >
                          {myResponseData.status === 'rejected' ? "Ubah Menjadi Setuju" : "Setujui Topik"}
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setShowRejectModal(true)}
                        disabled={isSubmitting}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all active:scale-95 border disabled:opacity-50 ${
                          myResponseData.status === 'accepted'
                          ? 'bg-emerald-700 border-emerald-500 hover:bg-emerald-800'
                          : myResponseData.status === 'rejected'
                          ? 'bg-red-700 border-red-500 hover:bg-red-800'
                          : 'bg-blue-700 border-blue-500 hover:bg-blue-800'
                        }`}
                      >
                        {myResponseData.status === 'accepted' ? "Batalkan / Tolak" : myResponseData.status === 'rejected' ? "Ubah Alasan Tolak" : "Tolak Topik"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
                    <Search size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">Mode Pratinjau (ReadOnly)</h3>
                    <p className="text-xs text-gray-500">
                      Anda melihat halaman ini sebagai {currentDosenId ? "Kaprodi / Dosen Lain" : "Tamu"}. Hak akses konfirmasi hanya tersedia bagi dosen pembimbing yang ditunjuk.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100"><FileText size={24} /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Dokumen Proposal.pdf</p>
                    <p className="text-xs text-gray-400 font-medium tracking-tight">Klik untuk meninjau isi penelitian mahasiswa</p>
                  </div>
                </div>
                <button onClick={handleOpenPdf} disabled={openingPdf || !proposal.file_path} className="px-6 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition">
                  {openingPdf ? "Membuka..." : "Lihat PDF"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6"><Info size={28} /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alasan Penolakan</h3>
              <p className="text-gray-500 text-sm mb-6">Berikan alasan mengapa Anda tidak dapat membimbing mahasiswa ini agar Kaprodi dapat mencarikan alternatif.</p>
              
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Kuota bimbingan semester ini sudah penuh..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all text-sm font-medium resize-none"
              />
            </div>
            <div className="p-8 bg-gray-50 flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">Batal</button>
              <button 
                onClick={() => handleResponse(false)}
                disabled={isSubmitting || !rejectReason}
                className="flex-1 py-3 text-sm font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl transition disabled:opacity-50"
              >
                {isSubmitting ? "Mengirim..." : "Kirim Penolakan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}