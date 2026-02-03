"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Bell, 
  User, 
  FileText, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function AccProposalKaprodi() {
  const searchParams = useSearchParams();
  const proposalId = searchParams.get("id");

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);

  // ================= FETCH DETAIL =================

  const fetchProposal = async () => {
    if (!proposalId) 
      return;

    setLoading(true);

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
      .single()
      .returns<ProposalDetail>();
      

    if (error) {
      console.error("Fetch proposal error:", error);
      // Jangan alert di sini agar UX tidak terganggu jika hanya refresh
    } else {
      if (!data) return; // 🔑 INI YANG KURANG
  console.log("RAW PROPOSAL DATA:", data);
  console.log("USER FIELD:", data.user);
  console.log("IS ARRAY?", Array.isArray(data.user));

  setProposal(data);

}

    

    setLoading(false);
  };

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  // ================= OPEN PDF =================

  const handleOpenPdf = async () => {
    if (!proposal?.file_path) {
      alert("File tidak tersedia");
      return;
    }

    try {
      setOpeningPdf(true);

      const { data, error } = await supabase.storage
        .from("proposals")
        .createSignedUrl(proposal.file_path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        alert("Gagal membuka file");
      }

    } catch (err: any) {
      console.error("Open PDF error:", err);
      alert(`Gagal membuka file: ${err.message}`);
    } finally {
      setOpeningPdf(false);
    }
  };

  // ================= APPROVE HANDLER =================

  const handleApprove = async () => {
    if (!proposal) return;

    const confirm = window.confirm("Yakin ingin menyetujui proposal ini?");
    if (!confirm) return;

    setApproving(true);

    try {
      // Update status menjadi 'Diterima'
      const { error } = await supabase
        .from("proposals")
        .update({ status: "Diterima" })
        .eq("id", proposal.id);

      if (error) throw error;

      alert("✅ Proposal berhasil disetujui!");
      fetchProposal(); // Refresh data

    } catch (err: any) {
      console.error("Approve error:", err);
      // Tampilkan pesan error detail dari database untuk debugging
      alert(`Gagal menyetujui proposal: ${err.message || "Izin ditolak (RLS Policy)"}`);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Memuat data...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Data proposal tidak ditemukan
      </div>
    );
  }
const user = proposal.user;

  // ================= RENDER =================

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8F9FB] font-sans text-slate-700">

    

      {/* MAIN */}
      <main className="flex-1 p-8">

        {/* BACK */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dosen/aksesproposal" 
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>

          <h1 className="text-xl font-bold text-gray-900">
            Detail Proposal Mahasiswa
          </h1>
        </div>

        <div className="space-y-6">

          {/* Card Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8 flex items-center gap-5">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <User size={40} className="text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.nama ?? "Tanpa Nama"}
                </h2>
                <p className="text-gray-500 font-medium mt-1">
                  {user?.npm ?? "-"}
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

          {/* File */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              File Proposal Mahasiswa
            </h3>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors bg-white">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center border border-red-100 shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate pr-4">
                    {proposal.file_path?.split("/").pop() || "Dokumen"}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    PDF Document
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenPdf}
                disabled={openingPdf}
                className="px-6 py-2.5 bg-[#345d8a] text-white text-xs font-bold rounded-lg hover:bg-[#2a4a6e] transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {openingPdf ? "Membuka..." : "Lihat PDF"}
              </button>
            </div>
          </div>

          {/* ACTION */}
          <div>
            <button
              onClick={handleApprove}
              disabled={approving || proposal.status === "Diterima"}
              className={`px-8 py-3 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95
                ${
                  proposal.status === "Diterima"
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#78aca0] hover:bg-[#639186] text-white"
                }
              `}
            >
              {proposal.status === "Diterima"
                ? "Sudah Disetujui"
                : approving
                ? "Memproses..."
                : "Setujui Proposal"}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}