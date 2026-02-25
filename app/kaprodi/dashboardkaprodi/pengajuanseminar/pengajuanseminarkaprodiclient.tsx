"use client";

import { useEffect, useState } from "react";
import NotificationBell from '@/components/notificationBell';
import { Search, Bell, CalendarCheck, User, BookOpen, ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface SeminarRequest {
  id: string;
  status: string;
  proposal: {
    judul: string;
    bidang: string;
    user: {
      nama: string;
      npm: string;
    }[];
  }[];
}

export default function PengajuanSeminarKaprodiClient() {
  const [students, setStudents] = useState<SeminarRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH DATA (Backend Logic Tetap) =================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('seminar_requests')
          .select(`
            id,
            status,
            proposal:proposals (
              judul,
              bidang,
              user:profiles (
                nama,
                npm
              )
            )
          `)
          .eq('status', 'Menunggu Persetujuan') // Data baru muncul jika status SUDAH diubah mahasiswa
          .eq('approved_by_p1', true)           // Dan P1 sudah ACC
          .eq('approved_by_p2', true)          // Dan P2 sudah ACC
      .order('created_at', { ascending: false });

        if (error) throw error;
        setStudents(data);

      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                          <div className="flex items-center gap-6">
                            <div className="relative w-72 group">
                            </div>
                          </div>
                
                        <div className="flex items-center gap-6">
                    {/* KOMPONEN LONCENG BARU */}
                    <NotificationBell />
                    
                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                
                          <div className="flex items-center gap-6">
                            {/* Minimalist SIMPRO Text */}
                            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                              Simpro
                            </span>
                          </div>
                          </div>
                        </header>
          

      {/* --- MAIN CONTENT --- */}
      <main className="p-10 max-w-[1400px] mx-auto w-full">
        
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              Penjadwalan Seminar Hasil
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Tetapkan waktu, ruangan, dan penguji untuk mahasiswa yang telah siap seminar.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-xs font-black uppercase tracking-widest">
            <CalendarCheck size={16} />
            {students.length} Permintaan Masuk
          </div>
        </div>

        {/* --- TABLE CARD --- */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
             <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                <LayoutDashboard size={20} />
             </div>
             <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Antrean Pengajuan</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  <th className="px-8 py-6 w-[22%]">Mahasiswa</th>
                  <th className="px-8 py-6 w-[15%] text-center">NPM</th>
                  <th className="px-8 py-6 w-[35%]">Judul Skripsi</th>
                  <th className="px-8 py-6 w-[13%] text-center">Bidang</th>
                  <th className="px-8 py-6 w-[15%] text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-bold animate-pulse">
                      Menghubungkan ke database...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen size={48} className="text-slate-100" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Tidak Ada Pengajuan Baru</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      {/* INFORMASI MAHASISWA */}
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 uppercase">
                            {/* @ts-ignore */}
                            {item.proposal?.user?.nama?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tight">
                                {/* @ts-ignore */}
                                {item.proposal?.user?.nama || "-"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5 text-blue-500 font-bold text-[10px] uppercase tracking-widest">
                                <User size={10} /> Mahasiswa Aktif
                              </div>
                          </div>
                        </div>
                      </td>

                      {/* NPM */}
                      <td className="px-8 py-8 text-center">
                        <span className="text-xs font-bold text-slate-400 tracking-tighter tabular-nums">
                          {/* @ts-ignore */}
                          {item.proposal?.user?.npm || "-"}
                        </span>
                      </td>

                      {/* JUDUL */}
                      <td className="px-8 py-8">
                        <p className="text-[13px] font-bold text-slate-600 leading-relaxed italic line-clamp-2 pr-6">
                          {/* @ts-ignore */}
                          "{item.proposal?.judul || "-"}"
                        </p>
                      </td>

                      {/* BIDANG */}
                      <td className="px-8 py-8 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200">
                          {/* @ts-ignore */}
                          {item.proposal?.bidang || "-"}
                        </span>
                      </td>

                      {/* AKSI */}
                      <td className="px-8 py-8 text-center">
                        <Link href={`/kaprodi/dashboardkaprodi/penjadwalanseminar?id=${item.id}`}>
                          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95 group/btn">
                            ATUR JADWAL 
                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          
        </div>

      </main>
    </div>
  );
}