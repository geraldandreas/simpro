"use client";

import React, { useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import { sendNotification } from "@/lib/notificationUtils";
import Image from "next/image"; 
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 
import { 
  ArrowLeft, User, Calendar, MapPin, MessageSquare, ExternalLink, Edit, X, Search
} from "lucide-react";

// --- TYPES ---
interface StudentDetail {
  proposal_id: string;
  nama: string;
  npm: string;
  judul: string;
  status: string;
  pembimbing1: string;
  pembimbing2: string;
  avatar_url?: string | null;
}

interface GuidanceSession {
  id: string;
  sesi_ke: number;
  tanggal: string;
  jam: string;
  metode: string;
  keterangan: string;
  status: string; 
  hasil_bimbingan?: string;
}

interface proposalData {
  id: string;
  judul:string;
  status: string;
  user: {
    nama: string;
    npm: string;
    avatar_url?: string | null;
  };
}

// ================= FETCHER SWR =================
const fetchDetailBimbinganKaprodi = async (proposalId: string | null) => {
  if (!proposalId) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User belum login");

  // 1. Ambil Data Mahasiswa
  const { data, error: propError } = await supabase
    .from("proposals")
    .select(`
      id,
      judul,
      status,
      user:profiles (
        nama,
        npm,
        avatar_url
      )
    `)
    .eq("id", proposalId)
    .single();
    
  const propData = data as unknown as proposalData;
  if (propError) throw propError;

  // 2. Ambil Pembimbing
  const { data: supervisors } = await supabase
    .from("thesis_supervisors")
    .select(`role, dosen:profiles!thesis_supervisors_dosen_id_fkey ( nama )`)
    .eq("proposal_id", proposalId);
    
  let p1 = "-", p2 = "-";
  supervisors?.forEach((s: any) => {
    if (s.role === "utama") p1 = s.dosen?.nama;
    else p2 = s.dosen?.nama;
  });

  const studentDetail: StudentDetail = {
    proposal_id: propData?.id,
    nama: propData?.user?.nama || "Tanpa Nama",
    npm: propData?.user?.npm || "-",
    judul: propData?.judul,
    status: propData?.status,
    pembimbing1: p1,
    pembimbing2: p2,
    avatar_url: propData?.user?.avatar_url,
  };

  // 3. Ambil Riwayat Bimbingan
  const { data: guidanceData } = await supabase
    .from("guidance_sessions")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("dosen_id", user.id)
    .order("sesi_ke", { ascending: false });

  return {
    student: studentDetail,
    sessions: (guidanceData || []) as GuidanceSession[]
  };
};

export default function DetailMahasiswaBimbinganKaprodiClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    proposalId ? `detail_bimbingan_kaprodi_${proposalId}` : null,
    () => fetchDetailBimbinganKaprodi(proposalId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  const student = cache?.student || null;
  const sessions = cache?.sessions || [];

  // --- STATE UNTUK MODAL EDIT ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GuidanceSession | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // --- HANDLERS ---
  const handleEditClick = (session: GuidanceSession) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSavingEdit(true);

    try {
      // 1. Update data sesi di database
      const { error } = await supabase
        .from("guidance_sessions")
        .update({
          tanggal: editingSession.tanggal,
          jam: editingSession.jam,
          metode: editingSession.metode,
          keterangan: editingSession.keterangan,
          status: editingSession.status,
        })
        .eq("id", editingSession.id);

      if (error) throw error;

      // 2. Ambil user_id mahasiswa & Nama Dosen
      const namaDosen = student?.pembimbing1 || "Dosen Pembimbing";
      const { data: proposal } = await supabase
        .from("proposals")
        .select("user_id")
        .eq("id", proposalId)
        .single();

      if (proposal?.user_id) {
        let title = "Update Jadwal Bimbingan";
        let message = `Dosen ${namaDosen} telah memperbarui jadwal bimbingan Sesi ${editingSession.sesi_ke}.`;

        if (editingSession.status === "dibatalkan") {
          title = "Bimbingan Dibatalkan";
          message = `Maaf, bimbingan Sesi ${editingSession.sesi_ke} telah dibatalkan oleh Dosen ${namaDosen}.`;
        }

        // Kirim Notifikasi
        await sendNotification(proposal.user_id, title, message);
      }

      alert("✅ Detail sesi berhasil diperbarui!");
      setIsEditModalOpen(false);
      
      // 🔥 REFRESH DATA SWR TANPA RELOAD 🔥
      mutate(); 

    } catch (err: any) {
      alert("Gagal update: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Helper UI
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case "belum_dimulai": return <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Belum Mulai</span>;
      case "selesai": return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Selesai</span>;
      case "dibatalkan": return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Dibatalkan</span>;
      default: return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">-</span>;
    }
  };

  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F8F9FB]">
        <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6 shadow-inner relative overflow-hidden">
          <Search size={32} className="relative z-10" />
          <div className="absolute w-full h-full bg-gradient-to-tr from-transparent to-slate-50 opacity-50"></div>
        </div>
        <h2 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Data Tidak Ditemukan</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs">
          Mahasiswa yang Anda cari tidak ada di sistem atau Anda tidak memiliki akses.
        </p>
        <button onClick={() => window.history.back()} className="mt-8 px-6 py-3 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8F9FB] font-sans text-slate-700">
      <main className="flex-1 p-8">
        {/* HEADER CONTENT */}
        <div className="mb-10">
          <button 
            onClick={() => router.back()} 
            className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
              Kembali ke Mahasiswa Bimbingan
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* INFO MAHASISWA */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md text-blue-600 font-bold text-3xl relative overflow-hidden shrink-0">
                  {student.avatar_url ? (
                    <Image 
                      src={student.avatar_url} 
                      alt={student.nama} 
                      layout="fill" 
                      objectFit="cover" 
                    />
                  ) : (
                    student.nama.charAt(0).toUpperCase()
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900">{student.nama}</h2>
                <p className="text-sm text-gray-500 font-medium">{student.npm}</p>
              </div>
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Judul Skripsi</p>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed">"{student.judul}"</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pembimbing 1</p>
                  <div className="flex items-center gap-2"><User size={14} className="text-blue-500" /><span className="text-sm text-gray-700">{student.pembimbing1}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* RIWAYAT BIMBINGAN */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Riwayat Sesi Bimbingan</h3>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Calendar size={48} className="mb-4 text-gray-200" /><p>Belum ada riwayat bimbingan.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((sesi) => (
                      <div key={sesi.id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">{sesi.sesi_ke}</div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">Bimbingan Sesi Ke-{sesi.sesi_ke}</h4>
                              <p className="text-xs text-gray-500 font-medium">{formatDate(sesi.tanggal)} • {sesi.jam.substring(0, 5)} WIB</p>
                            </div>
                          </div>
                          {getSessionStatusBadge(sesi.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-gray-400 mt-0.5" />
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Metode</p><p className="text-sm font-semibold text-gray-800 capitalize">{sesi.metode}</p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MessageSquare size={16} className="text-gray-400 mt-0.5" />
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Keterangan / Lokasi</p><p className="text-sm font-medium text-gray-700">{sesi.keterangan || "-"}</p></div>
                          </div>
                        </div>

                        {/* HASIL BIMBINGAN */}
                        {sesi.status === 'selesai' && sesi.hasil_bimbingan && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 mb-1">Hasil Bimbingan:</p>
                            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">{sesi.hasil_bimbingan}</p>
                          </div>
                        )}

                        {/* ACTIONS */}
                        <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded transition bg-gray-100 hover:bg-gray-200"
                            onClick={() => handleEditClick(sesi)}
                          >
                            <Edit size={14} /> Edit Detail
                          </button>

                          <Link 
                            href={`/dosen/sesibimbingan?id=${sesi.id}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded transition hover:bg-blue-50"
                          >
                            <ExternalLink size={14} /> Lihat Detail
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODAL EDIT ================= */}
        {isEditModalOpen && editingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Edit Jadwal Sesi {editingSession.sesi_ke}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                    <input 
                      type="date" 
                      value={editingSession.tanggal}
                      onChange={(e) => setEditingSession({...editingSession, tanggal: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jam</label>
                    <input 
                      type="time" 
                      value={editingSession.jam}
                      onChange={(e) => setEditingSession({...editingSession, jam: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Metode</label>
                    <select 
                      value={editingSession.metode}
                      onChange={(e) => setEditingSession({...editingSession, metode: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Luring">Luring</option>
                      <option value="Daring">Daring</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select 
                      value={editingSession.status}
                      onChange={(e) => setEditingSession({...editingSession, status: e.target.value})}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 ${editingSession.status === 'selesai' ? 'text-green-600 bg-green-50' : 'text-gray-700'}`}
                    >
                      <option value="belum_dimulai">Belum Mulai</option>
                      <option value="selesai">Selesai </option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">keterangan / Lokasi</label>
                  <textarea 
                    rows={3}
                    value={editingSession.keterangan}
                    onChange={(e) => setEditingSession({...editingSession, keterangan: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingEdit}
                    className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
                  >
                    {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}