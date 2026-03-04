"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
  Info,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { sendNotification } from "@/lib/notificationUtils";
import NotificationBell from '@/components/notificationBell';
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// --- TYPES ---
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
  };
}

interface Dosen {
  id: string;
  nama: string;
}

export default function DetailProposalKaprodiClient() {
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myResponseData, setMyResponseData] = useState<any>(null);
  const [allSupervisorsStatus, setAllSupervisorsStatus] = useState<any[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ================= FETCH DATA =================
  useEffect(() => {
    if (!proposalId) return;

    const initData = async () => {
      setLoadingPage(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user.id || null;
        setCurrentUserId(userId);

        const { data: propData, error: propError } = await supabase
          .from("proposals")
          .select(`id, judul, file_path, status, user:profiles ( id, nama, npm, avatar_url )`)
          .eq("id", proposalId)
          .single();

        if (propError) throw propError;
        setProposal(propData as unknown as ProposalDetail);

        if (propData?.file_path) {
          const { data: signed } = await supabase.storage
            .from("proposals")
            .createSignedUrl(propData.file_path, 3600);
          setFileUrl(signed?.signedUrl ?? null);
        }

        const { data: dosenData } = await supabase
          .from("profiles")
          .select("id, nama")
          .in("role", ["dosen", "kaprodi"])
          .order("nama");
        setDosenList(dosenData || []);

        const { data: supervisors, error: supError } = await supabase
          .from("thesis_supervisors")
          .select(`dosen_id, role, status, rejection_reason, dosen:profiles ( nama )`)
          .eq("proposal_id", proposalId);

        if (supError) throw supError;

        const { data: recommendations } = await supabase
          .from("proposal_recommendations")
          .select(`dosen_id, tipe, dosen:profiles ( nama )`)
          .eq("proposal_id", proposalId);

        let displayList = supervisors ? [...supervisors] : [];

        if (recommendations && recommendations.length > 0) {
          recommendations.forEach(rec => {
            const isAlreadyProcessed = displayList.find(s => s.dosen_id === rec.dosen_id);
            if (!isAlreadyProcessed) {
              displayList.push({
                dosen_id: rec.dosen_id,
                role: rec.tipe === 'pembimbing1' ? 'utama' : 'pendamping',
                status: 'pending',
                rejection_reason: null,
                dosen: rec.dosen
              });
            }
          });
        }
        
        displayList.sort((a, b) => {
          if (a.role === 'utama' && b.role !== 'utama') return -1;
          if (a.role !== 'utama' && b.role === 'utama') return 1;
          return 0;
        });

        const p1 = displayList.find((s) => s.role === "utama");
        const p2 = displayList.find((s) => s.role === "pendamping");
        if (p1) setPembimbing1(p1.dosen_id);
        if (p2) setPembimbing2(p2.dosen_id);
        
        // Kunci form HANYA jika status proposal sudah 'Diterima' (sudah ditugaskan final)
        const activeStatuses = ["Pending", "Ditinjau Kaprodi", "Menunggu Persetujuan Dosbing", "Pengajuan Proposal", "Ditolak Dosbing", "Ditolak"];
        if (!activeStatuses.includes(propData.status)) {
          setIsAssigned(true);
        }

        setAllSupervisorsStatus(displayList);

        const me = displayList.find((s) => s.dosen_id === userId);
        setMyResponseData(me || null);

      } catch (err: any) {
        console.error("Init Data Error:", err.message);
      } finally {
        setLoadingPage(false);
      }
    };

    initData();
  }, [proposalId]);

  // ================= ACTIONS =================
  const handleDosenResponse = async (isAccepted: boolean) => {
    if (!currentUserId || !proposalId) return;
    if (!isAccepted && !rejectReason) return alert("Masukkan alasan penolakan!");

    try {
      setLoading(true);
      
      const myRole = myResponseData?.role || 'utama';

      // 1. Simpan respon dosen ke thesis_supervisors
      const { data: existing } = await supabase
        .from("thesis_supervisors")
        .select("id")
        .eq("proposal_id", proposalId)
        .eq("dosen_id", currentUserId)
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
            dosen_id: currentUserId,
            role: myRole,
            status: isAccepted ? "accepted" : "rejected",
            rejection_reason: isAccepted ? null : rejectReason
          });
        if (error) throw error;
      }

      // 🔥 2. UBAH STATUS PROPOSAL SECARA GLOBAL (DENGAN PENGECEKAN ERROR) 🔥
      if (!isAccepted) {
        // Jika DOSEN MENOLAK, status proposal langsung berubah jadi "Ditolak"
        const { error: propErr } = await supabase
           .from("proposals")
           .update({ status: "Ditolak Dosbing" })
           .eq("id", proposalId);
           
        if (propErr) throw propErr; // Jika update proposal gagal, throw error!

      } else {
        // Jika dosen SETUJU, kita cek dulu apakah dosen SATUNYA pernah menolak?
        const { data: checkSups } = await supabase
          .from("thesis_supervisors")
          .select("status")
          .eq("proposal_id", proposalId);

        const hasRejected = checkSups?.some(s => s.status === 'rejected');
        
        if (!hasRejected) {
          // Jika tidak ada yang menolak, kembalikan ke status aman
          const { error: propErr2 } = await supabase
            .from("proposals")
            .update({ status: "Menunggu Persetujuan Dosbing" })
            .eq("id", proposalId);
            
          if (propErr2) throw propErr2; // Jika update proposal gagal, throw error!
        }
      }

      alert(isAccepted ? "✅ Berhasil menyetujui" : "✅ Berhasil menolak dan mengubah status!");
      window.location.reload(); 
    } catch (err: any) {
      // Sekarang error dari Supabase (termasuk urusan proposal) akan muncul di sini
      alert("Gagal memproses ke Database: " + err.message);
    } finally {
      setLoading(false);
      setShowRejectModal(false);
    }
  };

 const handleTugaskan = async () => {
  if (!proposalId) return;
  if (!pembimbing1) return alert("Pilih Pembimbing 1");

  try {
    setLoading(true);
    
    // 1. Bersihkan data lama di thesis_supervisors untuk proposal ini
    await supabase.from("thesis_supervisors").delete().eq("proposal_id", proposalId);

    // 2. Masukkan data FINAL pilihan Kaprodi dengan status 'accepted' 
    const payload = [
      { 
        proposal_id: proposalId, 
        dosen_id: pembimbing1, 
        role: "utama", 
        status: "accepted" 
      }
    ];

    if (pembimbing2) {
      payload.push({ 
        proposal_id: proposalId, 
        dosen_id: pembimbing2, 
        role: "pendamping", 
        status: "accepted" 
      });
    }

    const { error: insertError } = await supabase.from("thesis_supervisors").insert(payload);
    if (insertError) throw insertError;

    // 3. Update status proposal menjadi 'Diterima'
    await supabase.from("proposals").update({ status: "Diterima" }).eq("id", proposalId);

    // 4. Hapus riwayat dari proposal_recommendations agar bersih
    await supabase.from("proposal_recommendations").delete().eq("proposal_id", proposalId);

    // 5. Kirim Notif ke Mahasiswa
    if (proposal?.user?.id) {
      await sendNotification(
        proposal.user.id, 
        "Proposal Diterima", 
        `Selamat! Proposal Anda telah diterima dan pembimbing telah ditetapkan oleh Kaprodi.`
      );
    }

    setIsAssigned(true);
    alert("✅ Penugasan Final Berhasil! Status Proposal kini: DITERIMA");
    window.location.reload();
  } catch (err: any) { 
    alert("Gagal: " + err.message); 
  } finally { 
    setLoading(false); 
  }
};

  const handleReset = async () => {
    if (!proposalId) return;
    if (!window.confirm("Apakah Anda yakin ingin mereset dosen pembimbing? Ini akan mengembalikan proposal ke status 'Menunggu Persetujuan Dosbing'")) return;
    try {
      setLoading(true);
      await supabase.from("thesis_supervisors").delete().eq("proposal_id", proposalId);
      await supabase.from("proposals").update({ status: "Menunggu Persetujuan Dosbing" }).eq("id", proposalId);
      setIsAssigned(false);
      setPembimbing1(""); setPembimbing2("");
      alert("✅ Data pembimbing berhasil dihapus.");
      window.location.reload();
    } catch (err: any) { alert("Gagal menghapus: " + err.message); } finally { setLoading(false); }
  };

  if (loadingPage) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] text-slate-400 font-black tracking-widest uppercase animate-pulse">Memuat Data...</div>;
  if (!proposal) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] text-slate-500">Data tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-700">
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
          <Link href="/kaprodi/dashboardkaprodi/aksesproposal" className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Review Proposal</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            {/* Info Mahasiswa */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10 relative overflow-hidden group">
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-28 h-28 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl overflow-hidden shrink-0 relative">
                  {proposal.user?.avatar_url ? (
                    <Image 
                      src={proposal.user.avatar_url} 
                      alt={proposal.user?.nama || "User"} 
                      layout="fill" 
                      objectFit="cover" 
                    />
                  ) : (
                    <User size={56} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">{proposal.user?.nama}</h2>
                  <p className="text-blue-600 font-black tracking-[0.15em] text-xs mt-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit">{proposal.user?.npm}</p>
                </div>
              </div>
              <div className="px-10 py-8 mt-10 bg-slate-50/50 border-t border-slate-100 rounded-b-[2.5rem] -mx-10 -mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{proposal.judul}"</p>
                <span className={`shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                  proposal.status === 'Ditolak Dosbing' || proposal.status === 'Ditolak' ? 'bg-red-50 text-red-600 border-red-200' :
                  proposal.status === 'Diterima' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {proposal.status}
                </span>
              </div>
            </div>

            {/* Preview Dokumen */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg"><FileText size={20} /></div>
                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-tighter">Dokumen Proposal Skripsi</h3>
              </div>
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex flex-col items-center group hover:bg-white hover:border-blue-100 transition-all shadow-inner hover:shadow-xl">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-500 shadow-sm mb-6"><FileText size={40} /></div>
                <a href={fileUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-blue-600 transition-all uppercase tracking-widest shadow-lg">
                  <Download size={18} /> Lihat Dokumen Lengkap
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            {/* Panel Respon Pribadi (MUNCUL JIKA KAPRODI DIAJUKAN MAHASISWA) */}
{myResponseData && (
  <div className={`rounded-[2rem] p-8 text-white shadow-xl transition-all duration-300 ${myResponseData.status === 'accepted' ? 'bg-emerald-600 shadow-emerald-100' : myResponseData.status === 'rejected' ? 'bg-red-600 shadow-red-100' : 'bg-blue-600 shadow-blue-100'}`}>
    <h3 className="font-black text-sm uppercase mb-4 tracking-tighter flex items-center gap-2"><User size={20}/> Respon Anda</h3>
    <p className="text-xs opacity-90 mb-6 font-medium leading-relaxed">
      {myResponseData.status === 'rejected' && <span className="block mt-3 bg-red-800/50 p-3 rounded-xl italic text-[10px]">Alasan: {myResponseData.rejection_reason}</span>}
    </p>
    
    {/* 🔥 LOGIKA LOCK: Sembunyikan tombol jika status utama proposal sudah Diterima */}
    {proposal.status === "Diterima" ? (
      <div className="mt-4 p-3 bg-white/20 rounded-xl text-center border border-white/30">
        <p className="text-[10px] font-black uppercase tracking-widest">Respon Terkunci</p>
        <p className="text-[9px] mt-1 opacity-80">Pembimbing telah ditetapkan final.</p>
      </div>
    ) : (
      <div className="flex gap-3">
        {myResponseData.status !== 'accepted' && (
          <button onClick={() => handleDosenResponse(true)} disabled={loading} className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase hover:scale-95 transition-transform disabled:opacity-50">
            Terima
          </button>
        )}
        {myResponseData.status !== 'rejected' && (
          <button onClick={() => setShowRejectModal(true)} disabled={loading} className="flex-1 bg-black/20 border border-white/20 py-3 rounded-xl font-black text-[10px] uppercase hover:scale-95 transition-transform disabled:opacity-50">
            Tolak
          </button>
        )}
      </div>
    )}
  </div>
)}

            {/* Panel Otoritas Kaprodi */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl p-8 sticky top-28 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><ShieldCheck size={20} /></div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Otoritas Kaprodi</h2>
              </div>

              {/* MONITORING STATUS DOSEN DENGAN ALASAN PENOLAKAN */}
              {allSupervisorsStatus.length > 0 && (
                <div className="mb-8 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pantau Persetujuan Dosen</p>
                  {allSupervisorsStatus.map((s, idx) => (
                    <div key={idx} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate">{s.dosen?.nama}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">P{s.role === 'utama' ? '1' : '2'}</p>
                        </div>
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${
                          s.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 
                          s.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {s.status === 'pending' ? 'Menunggu' : s.status}
                        </span>
                      </div>
                      
                      {/* Tampilkan Alasan Jika Ditolak */}
                      {s.status === 'rejected' && (
                        <div className="mt-2 p-3 bg-red-50/50 border border-red-100 rounded-xl flex gap-2 items-start">
                          <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-600 font-medium italic leading-relaxed">
                            "{s.rejection_reason || 'Tidak ada alasan spesifik'}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Form Seleksi & Penugasan */}
              <div className="space-y-6">
                {[
                  { label: "Pembimbing Utama (P1)", state: pembimbing1, setState: setPembimbing1 },
                  { label: "Pembimbing Pendamping (P2)", state: pembimbing2, setState: setPembimbing2 }
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase ml-1">{item.label}</label>
                    <div className="relative group">
                      <select 
                        value={item.state}
                        onChange={(e) => item.setState(e.target.value)}
                        disabled={isAssigned} 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-4 px-5 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm disabled:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">-- PILIH DOSEN --</option>
                        {dosenList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                    </div>
                  </div>
                ))}

                <div className="pt-4 space-y-3">
                  {!isAssigned ? (
                    <button onClick={handleTugaskan} disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-[0.15em] text-xs shadow-xl shadow-blue-100 active:scale-95">
                      {loading ? "Memproses..." : "Konfirmasi Penugasan Final"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                        <CheckCircle className="text-emerald-600" size={18} />
                        <p className="text-[10px] font-black text-emerald-800 uppercase">Status: DITERIMA</p>
                      </div>
                      <button onClick={handleReset} disabled={loading} className="w-full py-4 bg-white text-red-600 border border-red-100 font-black rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-3 uppercase text-[10px] shadow-sm active:scale-95">
                        <Trash2 size={16} /> Reset Penugasan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Penolakan */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Info size={32} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Alasan Penolakan</h3>
              <p className="text-slate-500 text-xs mb-6 font-medium">Mahasiswa dan Kaprodi akan melihat alasan ini.</p>
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Misal: Topik tidak sesuai kepakaran saya..." 
                className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] mt-4 font-bold text-sm outline-none focus:ring-4 focus:ring-red-50 transition-all placeholder:text-slate-300 resize-none" 
              />
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Batal</button>
                <button 
                  onClick={() => handleDosenResponse(false)} 
                  disabled={!rejectReason || loading}
                  className="flex-1 py-4 text-xs font-black bg-red-500 text-white rounded-xl shadow-lg shadow-red-100 uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {loading ? "Menyimpan..." : "Kirim Penolakan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}