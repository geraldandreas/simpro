"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Bell, 
  User, 
  FileText, 
  ChevronDown, 
  ArrowLeft,
  CheckCircle,
  Trash2,
  Download,
  ShieldCheck,
  Info
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- TYPES (Tetap Sama) ---
interface ProposalDetail {
  id: string;
  judul: string;
  file_path: string | null;
  user: {
    nama: string | null;
    npm: string | null;
  } | null;
}

interface Dosen {
  id: string;
  nama: string;
}

export default function DetailProposalKaprodi() {
  const searchParams = useSearchParams();
  const proposalId = searchParams.get("id");

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [pembimbing1, setPembimbing1] = useState("");
  const [pembimbing2, setPembimbing2] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [dosenList, setDosenList] = useState<Dosen[]>([]);

  // ================= FETCH DATA (Backend Logic Tetap) =================
  useEffect(() => {
    if (!proposalId) return;
    const initData = async () => {
      setLoadingPage(true);
      try {
        const { data: propData, error: propError } = await supabase
          .from("proposals")
          .select(`id, judul, file_path, user:profiles ( id, nama, npm )`)
          .eq("id", proposalId).single();

        if (propError) throw propError;
        setProposal(propData as ProposalDetail);

        if (propData?.file_path) {
          const { data: signed } = await supabase.storage
            .from("proposals").createSignedUrl(propData.file_path, 3600);
          setFileUrl(signed?.signedUrl ?? null);
        }

        const { data: dosenData } = await supabase
          .from("profiles").select("id, nama")
          .in("role", ["dosen", "kaprodi"]).order("nama");
        setDosenList(dosenData || []);

        const { data: supervisors } = await supabase
          .from("thesis_supervisors").select("dosen_id, role")
          .eq("proposal_id", proposalId);

        if (supervisors && supervisors.length > 0) {
          setIsAssigned(true);
          const p1 = supervisors.find((s) => s.role === "utama");
          const p2 = supervisors.find((s) => s.role === "pendamping"); 
          if (p1) setPembimbing1(p1.dosen_id);
          if (p2) setPembimbing2(p2.dosen_id);
        } else {
          const { data: recommendations } = await supabase
            .from("proposal_recommendations").select("dosen_id, tipe")
            .eq("proposal_id", proposalId);

          if (recommendations && recommendations.length > 0) {
            const reqP1 = recommendations.find((r) => r.tipe === "pembimbing1");
            const reqP2 = recommendations.find((r) => r.tipe === "pembimbing2");
            if (reqP1) setPembimbing1(reqP1.dosen_id);
            if (reqP2) setPembimbing2(reqP2.dosen_id);
          }
        }
      } catch (err) { console.error(err); } finally { setLoadingPage(false); }
    };
    initData();
  }, [proposalId]);

  // ================= ASSIGN DOSEN (Backend Logic Tetap) =================
  const handleTugaskan = async () => {
    if (!proposalId) return;
    if (!pembimbing1) return alert("Pilih Pembimbing 1");
    if (pembimbing1 === pembimbing2) return alert("Pembimbing tidak boleh sama");

    try {
      setLoading(true);
      await supabase.from("thesis_supervisors").delete().eq("proposal_id", proposalId);
      const payload = [{ proposal_id: proposalId, dosen_id: pembimbing1, role: "utama" }];
      if (pembimbing2) payload.push({ proposal_id: proposalId, dosen_id: pembimbing2, role: "pendamping" });
      
      const { error } = await supabase.from("thesis_supervisors").insert(payload);
      if (error) throw error;
      await supabase.from("proposals").update({ status: "Menunggu Persetujuan Dosbing" }).eq("id", proposalId);

      setIsAssigned(true);
      alert("✅ Berhasil menugaskan dosen!");
    } catch (err: any) { alert("Gagal: " + err.message); } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!proposalId) return;
    if (!window.confirm("Apakah Anda yakin ingin mereset dosen pembimbing?")) return;
    try {
      setLoading(true);
      await supabase.from("thesis_supervisors").delete().eq("proposal_id", proposalId);
      setIsAssigned(false);
      setPembimbing1(""); setPembimbing2("");
      alert("✅ Data pembimbing berhasil dihapus.");
    } catch (err: any) { alert("Gagal menghapus: " + err.message); } finally { setLoading(false); }
  };

  if (loadingPage) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] text-slate-400 font-bold animate-pulse">Memuat Data...</div>;
  if (!proposal) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] text-slate-500">Data tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700">
      
      {/* HEADER - Glassmorphism Effect */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20">
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input type="text" placeholder="Cari dokumen..." className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-sm outline-none transition-all shadow-inner" />
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 ml-2 uppercase">K</div>
        </div>
      </header>

      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        
        {/* Navigation */}
        <div className="flex items-center gap-5 mb-10">
          <Link href="/kaprodi/dashboardkaprodi/aksesproposal" className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Review Proposal Mahasiswa</h1>
            <p className="text-slate-500 font-medium">Lakukan verifikasi berkas dan penugasan dosen pembimbing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* KOLOM KIRI (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Info Mahasiswa Card */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <User size={180} />
              </div>
              <div className="p-10 flex items-center gap-8 relative z-10">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl overflow-hidden shrink-0">
                  <User size={56} className="text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">{proposal.user?.nama ?? "Tanpa Nama"}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">
                    {proposal.user?.npm ?? "-"}
                  </p>
                </div>
              </div>
              <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                   <Info size={16} className="text-slate-400" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Usulan Skripsi</p>
                </div>
                <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{proposal.judul}"</p>
              </div>
            </div>

            {/* Document Preview Card */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                   <FileText size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter text-[13px]">Dokumen Pendukung</h3>
              </div>
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-blue-100 transition-all duration-300 shadow-inner hover:shadow-xl">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-500 shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  <FileText size={40} />
                </div>
                <p className="text-sm font-black text-slate-700 mb-2 truncate max-w-md uppercase tracking-tight">{proposal.file_path?.split('/').pop() ?? "file_proposal.pdf"}</p>
                <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest tracking-tighter">Format PDF • Ukuran Berkas Terlampir</p>
                <a href={fileUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95 uppercase tracking-widest">
                  <Download size={18} /> Lihat Dokumen Lengkap
                </a>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (4/12) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-8 sticky top-28 overflow-hidden relative">
              
              <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Penugasan Dosen</h2>
              </div>

              {/* Status Badge */}
              {isAssigned && (
                <div className="mb-8 p-5 bg-green-50 border border-green-100 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <CheckCircle className="text-green-600 shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-xs font-black text-green-800 uppercase tracking-tight">Status: Ditugaskan</p>
                    <p className="text-[11px] text-green-700/80 mt-1 font-medium leading-relaxed">Dosen pembimbing telah ditetapkan secara resmi dalam sistem.</p>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Select Fields */}
                {[
                  { label: "Pembimbing Utama", state: pembimbing1, setState: setPembimbing1 },
                  { label: "Pembimbing Pendamping", state: pembimbing2, setState: setPembimbing2 }
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">{item.label}</label>
                    <div className="relative group">
                      <select 
                        value={item.state}
                        onChange={(e) => item.setState(e.target.value)}
                        disabled={isAssigned} 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-4 px-5 pr-12 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-sm disabled:bg-white disabled:text-slate-400 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="">-- PILIH DOSEN --</option>
                        {dosenList.map((d) => (
                          <option key={d.id} value={d.id}>{d.nama}</option>
                        ))}
                      </select>
                      {!isAssigned && (
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Buttons */}
                {!isAssigned ? (
                  <button 
                    onClick={handleTugaskan}
                    disabled={loading}
                    className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 text-xs uppercase tracking-[0.15em] disabled:opacity-50 mt-4"
                  >
                    {loading ? "Memproses..." : "Konfirmasi Penugasan"}
                  </button>
                ) : (
                  <button 
                    onClick={handleReset}
                    disabled={loading}
                    className="w-full py-5 bg-red-50 text-red-600 border border-red-100 font-black rounded-2xl hover:bg-red-100 transition-all active:scale-95 text-xs flex items-center justify-center gap-3 uppercase tracking-widest mt-4 shadow-sm"
                  >
                    {loading ? "Menghapus..." : (
                      <>
                        <Trash2 size={18} />
                        Reset Data Dosen
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}