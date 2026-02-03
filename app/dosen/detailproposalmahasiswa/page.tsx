"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Bell, 
  User, 
  FileText, 
  ArrowLeft,
  CheckCircle,
  Info,
  Clock
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ---------------- TYPES ----------------

interface ProposalDetail {
  id: string;
  judul: string;
  file_path: string | null;
  status: string;
  user: {
    nama: string | null;
    npm: string | null;
  } | null;
}

// ---------------- PAGE ----------------

export default function DetailProposalMahasiswa() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPdf, setOpeningPdf] = useState(false);

  // ================= FETCH DETAIL =================

  const fetchProposal = async () => {
    if (!proposalId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id,
          judul,
          file_path,
          status,
          user:profiles (
            nama,
            npm
          )
        `)
        .eq("id", proposalId)
        .single();

      if (error) throw error;
      
      if (data) {
      setProposal({
        id: data.id,
        judul: data.judul,
        file_path: data.file_path,
        status: data.status,
        user: data.user ?? null // 🔑 KUNCI UTAMA
      });
    }

    } catch (error: any) {
      console.error("Fetch proposal error:", error.message);
      alert("Gagal memuat data proposal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  // ================= ACTIONS =================

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
      console.error("Open PDF error:", err.message);
      alert("Tidak bisa membuka file (akses ditolak / file tidak ditemukan)");
    } finally {
      setOpeningPdf(false);
    }
  };

  // ================= UI RENDER =================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 bg-[#F8F9FB]">
        Memuat data...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-[#F8F9FB]">
        Data proposal tidak ditemukan.
      </div>
    );
  }

  const isAccepted = proposal.status === "Diterima";

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
   

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">

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
        <main className="flex-1 p-8">

          {/* BACK BUTTON */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Detail Proposal Mahasiswa
            </h1>
          </div>

          <div className="space-y-6">

            {/* CARD MAHASISWA */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8 flex items-center gap-5">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0">
                  <User size={40} className="text-gray-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {proposal.user?.nama || "Tanpa Nama"}
                  </h2>
                  <p className="text-gray-500 font-medium mt-1">
                    {proposal.user?.npm || "-"}
                  </p>
                </div>
              </div>

              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Judul Proposal
                </h3>
                <p className="text-lg font-bold text-gray-800 leading-relaxed">
                  {proposal.judul}
                </p>
              </div>
            </div>

            {/* CARD FILE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                File Proposal Mahasiswa
              </h3>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center border border-red-100">
                    <FileText size={24} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate max-w-md">
                      {proposal.file_path ? proposal.file_path.split("/").pop() : "Tidak ada file"}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      PDF Document
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenPdf}
                  disabled={openingPdf || !proposal.file_path}
                  className="px-6 py-2.5 bg-[#345d8a] text-white text-xs font-bold rounded-lg hover:bg-[#2a4a6e] disabled:opacity-60 transition shadow-sm whitespace-nowrap"
                >
                  {openingPdf ? "Membuka..." : "Lihat PDF"}
                </button>
              </div>
            </div>

            {/* STATUS INFO ONLY */}
            {isAccepted ? (
              // TAMPILAN JIKA SUDAH DITERIMA
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-green-100 text-green-600 rounded-full shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-800 mb-1">
                    Mahasiswa sudah memiliki dosen pembimbing
                  </h3>
                  <p className="text-sm text-green-700">
                    Proposal ini telah disetujui. Mahasiswa sedang dalam proses bimbingan.
                  </p>
                </div>
              </div>
            ) : (
              // TAMPILAN BELUM ADA PEMBIMBING (HANYA INFO)
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-gray-100 text-gray-500 rounded-full shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    Topik ini belum ada pembimbingnya
                  </h3>
                  <p className="text-sm text-gray-600">
                    Mahasiswa masih menunggu persetujuan dosen pembimbing untuk proposal ini.
                  </p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}