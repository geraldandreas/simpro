"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import NotificationBell from '@/components/notificationBell';
import Image from "next/image";
import { Search, Bell, CalendarCheck, User, BookOpen, ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// 🔥 Interface diperbaiki
interface SeminarRequest {
  id: string;
  status: string;
  proposal: {
    judul: string;
    bidang: string;
    user: {
      nama: string;
      npm: string;
      avatar_url?: string | null;
    };
  };
}

// ================= FETCHER SWR =================
const fetchSeminarRequests = async () => {
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
          npm,
          avatar_url
        )
      )
    `)
    .eq('status', 'Menunggu Persetujuan') 
    .eq('approved_by_p1', true)           
    .eq('approved_by_p2', true)          
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Memaksa tipe data agar sesuai dengan interface
  return data as unknown as SeminarRequest[];
};

export default function PengajuanSeminarKaprodiClient() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: students = [], isLoading } = useSWR(
    'pengajuan_seminar_kaprodi_list',
    fetchSeminarRequests,
    {
      revalidateOnFocus: true, // Auto refresh saat user kembali ke tab ini
      refreshInterval: 60000   // Refresh data di background tiap 1 menit
    }
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans text-slate-700">

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
                  <th className="px-8 py-6 w-[35%] text-center">Judul Skripsi</th>
                  <th className="px-8 py-6 w-[13%] text-center">Bidang</th>
                  <th className="px-8 py-6 w-[15%] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                
                {/* 🔥 SKELETON DIPANGGIL DI SINI 🔥 */}
                {isLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </>
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
                  students.map((item) => {
                    const userData = item.proposal?.user;

                    return (
                      <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                        {/* INFORMASI MAHASISWA */}
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all relative overflow-hidden shrink-0 border border-slate-200 uppercase">
                              {userData?.avatar_url ? (
                                <Image 
                                  src={userData.avatar_url} 
                                  alt={userData.nama || "User"} 
                                  layout="fill" 
                                  objectFit="cover" 
                                />
                              ) : (
                                userData?.nama?.charAt(0) || "?"
                              )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tight">
                                  {userData?.nama || "-"}
                                </p>
                            </div>
                          </div>
                        </td>

                        {/* NPM */}
                        <td className="px-8 py-8 text-center">
                          <span className="text-xs font-bold text-slate-400 tracking-tighter tabular-nums">
                            {userData?.npm || "-"}
                          </span>
                        </td>

                        {/* JUDUL */}
                        <td className="px-8 py-8">
                          <p className="text-[13px] font-bold text-slate-600 text-center leading-relaxed line-clamp-2 pr-6">
                            "{item.proposal?.judul || "-"}"
                          </p>
                        </td>

                        {/* BIDANG */}
                        <td className="px-8 py-8 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200">
                            {item.proposal?.bidang || "-"}
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="px-8 py-8 text-center">
                          <Link href={`/kaprodi/penjadwalanseminar?id=${item.id}`}>
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95 group/btn">
                              ATUR JADWAL 
                              <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// 🔥 HELPER SKELETON ROW
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-50 last:border-0">
      {/* Kolom Mahasiswa */}
      <td className="px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-300 shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-slate-300 rounded-md"></div>
            <div className="h-3 w-20 bg-slate-200 rounded-md"></div>
          </div>
        </div>
      </td>

      {/* Kolom NPM */}
      <td className="px-8 py-8 text-center">
        <div className="h-4 w-24 bg-slate-300 rounded-md mx-auto"></div>
      </td>

      {/* Kolom Judul Skripsi */}
      <td className="px-8 py-8">
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-300 rounded-md"></div>
          <div className="h-4 w-2/3 bg-slate-200 rounded-md"></div>
        </div>
      </td>

      {/* Kolom Bidang */}
      <td className="px-8 py-8 text-center">
        <div className="h-6 w-20 bg-slate-200 rounded-lg mx-auto"></div>
      </td>

      {/* Kolom Tindakan */}
      <td className="px-8 py-8 text-center">
        <div className="h-10 w-32 bg-slate-300 rounded-xl mx-auto"></div>
      </td>
    </tr>
  );
}