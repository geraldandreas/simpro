"use client";

import React, { useState, useEffect } from 'react';
import SidebarTendik from '@/components/sidebar-tendik';
import { supabase } from "@/lib/supabaseClient";
import { 
  FileText, Bell, Search, MoreHorizontal, 
  Eye, Download, CheckCircle, XCircle, 
  Calendar, Users 
} from 'lucide-react';

/* =======================
    TYPES
======================= */
interface VerificationItem {
  id: string;
  nama_dokumen: string;
  file_url: string;
  created_at: string;
  proposal: {
    profiles: {
      nama: string;
    };
  };
}

const DOC_LABEL: Record<string, string> = {
  berita_acara_bimbingan: "Berita Acara Bimbingan",
  transkrip_nilai: "Transkrip Nilai",
  matriks_perbaikan: "Matriks Perbaikan",
  toefl: "Sertifikat TOEFL",
  print_jurnal: "Print Jurnal",
  sertifikat_publikasi: "Sertifikat Publikasi",
  test_manual: "Dokumen Manual",
};

export default function DashboardTendik() {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationItem[]>([]);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [statUsulan, setStatUsulan] = useState(0);
  const [statVerifikasi, setStatVerifikasi] = useState(0);

  // 1. Fetch Stats
  const fetchDashboardStats = async () => {
    const [usulan, verif] = await Promise.all([
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("status", "Pengajuan"),
      supabase.from("seminar_documents").select("id", { count: "exact", head: true }).eq("status", "Menunggu Verifikasi")
    ]);
    setStatUsulan(usulan.count ?? 0);
    setStatVerifikasi(verif.count ?? 0);
  };

  // 2. Fetch Verification (Fixed Relationship Query)
  const fetchVerification = async () => {
    try {
      setLoadingVerification(true);
      const { data, error } = await supabase
        .from("seminar_documents")
        .select(`
          id, nama_dokumen, file_url, created_at,
          proposal:proposals (
            profiles:user_id ( nama )
          )
        `)
        .eq("status", "Menunggu Verifikasi")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVerificationData(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVerification(false);
    }
  };

  // 3. Action Handlers
  const openFile = async (path: string, download = false) => {
    const cleanPath = path.replace(/^docseminar\//, "");
    const { data } = await supabase.storage.from("docseminar").createSignedUrl(cleanPath, 300);
    if (!data?.signedUrl) return alert("File tidak ditemukan");

    if (download) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = cleanPath.split("/").pop() || "berkas.pdf";
      a.click();
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  const updateStatus = async (id: string, status: "Lengkap" | "Ditolak") => {
    if (!confirm("Konfirmasi perubahan status berkas?")) return;
    await supabase.from("seminar_documents").update({ status, verified_at: new Date().toISOString() }).eq("id", id);
    fetchVerification();
    fetchDashboardStats();
    setActiveDropdownId(null);
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchVerification();
  }, []);

  return (
    <div className="flex min-h-screen ">
      <SidebarTendik />
      <main className="flex-1 ml-64 p-10">
        
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

        {/* STATS */}
        <div className="grid grid-cols-2 gap-10 mb-10  justify-items-center">
          <StatCard icon={<Users size={24}/>} count={statUsulan} label="Usulan Judul" color="text-blue-600" />
          <StatCard icon={<FileText size={24}/>} count={statVerifikasi} label="Perlu Verifikasi" color="text-red-500" />
        </div>
      <main className="flex-1 p-10"></main>
        {/* TABLE */}
        <section className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-visible">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h2 className="text-lg font-black text-slate-800 tracking-widest">Antrean Verifikasi Berkas</h2>
            <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-blue-100">{verificationData.length} Berkas Masuk</span>
          </div>

          <div className="divide-y divide-slate-50">
            {loadingVerification ? (
              <div className="p-20 text-center animate-pulse font-black text-slate-300">Menghubungkan ke Server...</div>
            ) : verificationData.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center opacity-30">
                <CheckCircle size={60} className="mb-4 text-slate-200" />
                <p className="font-black text-xs tracking-widest">Data Bersih - Tidak Ada Antrean</p>
              </div>
            ) : (
              verificationData.map((item) => (
                <div key={item.id} className="px-10 py-8 flex items-center justify-between hover:bg-blue-50/30 transition-all verification-menu-container relative group">
                  <div className="grid grid-cols-12 w-full items-center">
                    
                    {/* NAMA MAHASISWA - PERBAIKAN LOGIC AKSES */}
                    <div className="col-span-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mahasiswa</p>
                      <p className="font-black text-slate-800 text-sm tracking-tight">
                        {(item.proposal as any)?.profiles?.nama || "Tanpa Nama"}
                      </p>
                    </div>

                    <div className="col-span-5 flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm"><FileText size={20}/></div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jenis Dokumen</p>
                         <p className="font-black text-slate-700 text-sm">{DOC_LABEL[item.nama_dokumen] || item.nama_dokumen}</p>
                       </div>
                    </div>

                    <div className="col-span-3 text-right pr-12">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diterima</p>
                      <p className="font-bold text-slate-500 text-xs tracking-widest">{new Date(item.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</p>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button 
                        onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                        className={`p-2 rounded-xl border transition-all ${activeDropdownId === item.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white text-slate-300 border-slate-100 hover:border-blue-600 hover:text-blue-600'}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {activeDropdownId === item.id && (
                        <div className="absolute right-12 top-20 w-60 bg-white rounded-[1.5rem] shadow-2xl border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2 space-y-1">
                            <button onClick={() => openFile(item.file_url)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Eye size={16}/> Lihat Berkas</button>
                            <button onClick={() => openFile(item.file_url, true)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest"><Download size={16}/> Unduh PDF</button>
                            <div className="h-px bg-slate-50 my-1 mx-2" />
                            <button onClick={() => updateStatus(item.id, 'Lengkap')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition uppercase tracking-widest"><CheckCircle size={16}/> Verifikasi</button>
                            <button onClick={() => updateStatus(item.id, 'Ditolak')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-red-600 hover:bg-red-50 rounded-xl transition uppercase tracking-widest"><XCircle size={16}/> Tolak Berkas</button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 group hover:translate-y-[-5px] transition-all duration-300">
      <div className={`p-4 rounded-2xl bg-slate-50 ${color} w-fit mb-6 transition-colors group-hover:bg-blue-600 group-hover:text-white shadow-inner`}>{icon}</div>
      <p className="text-4xl font-black text-slate-800 tracking-tighter leading-none mb-2">{count}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}