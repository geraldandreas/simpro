"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import NotificationBell from '@/components/notificationBell';
import Image from "next/image";
import {
  Search, 
  Bell, 
  CalendarCheck, 
  User,
  BookOpen, 
  ArrowRight, 
  LayoutDashboard, 
  ShieldCheck
} from "lucide-react"; 
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface StudentRow {
  sidang_request_id: string; 
  seminar_request_id: string; 
  nama: string;
  npm: string;
  avatar_url?: string | null;
  judul: string;
  bidang: string;
  file_name: string;
}

// ================= FETCHER SWR =================
const fetchSidangRequests = async () => {
  const { data, error } = await supabase
    .from("sidang_requests")
    .select(`
      id,
      seminar_request_id,
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
    .in('status', ['menunggu_penjadwalan']) 
    .order("created_at", { ascending: false });

  if (error) throw error;

  const mapped: StudentRow[] = (data || [])
    .filter((item: any) => item.proposal?.user) 
    .map((item: any) => {
      const prop = item.proposal;
      const profile = prop.user;

      return {
        sidang_request_id: item.id,
        seminar_request_id: item.seminar_request_id,
        nama: profile.nama,
        npm: profile.npm,
        avatar_url: profile.avatar_url || null,
        judul: prop.judul,
        bidang: prop.bidang,
        file_name: "Dokumen Sidang Lengkap (Tervalidasi Tendik)" 
      };
    });
  
  return mapped;
};

export default function PengajuanSidangKaprodiClient() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: students = [], isLoading } = useSWR(
    'pengajuan_sidang_kaprodi_list',
    fetchSidangRequests,
    {
      revalidateOnFocus: true, // Refresh otomatis saat kembali ke tab
      refreshInterval: 60000   // Refresh otomatis tiap 1 menit
    }
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      
      {/* MAIN CONTENT */}
      <main className="p-10 max-w-[1400px] mx-auto w-full">
        
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              Penjadwalan Sidang Akhir
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Tetapkan waktu dan ruangan untuk mahasiswa yang telah siap sidang.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-xs font-black uppercase tracking-widest shadow-sm">
            <CalendarCheck size={16} /> {students.length} Antrean Sidang
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3 text-slate-800">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><LayoutDashboard size={20} /></div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Mahasiswa Siap Sidang</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  <th className="px-8 py-6 w-[22%]">Mahasiswa</th>
                  <th className="px-8 py-6 w-[15%] text-center">NPM</th>
                  {/* 🔥 PERBAIKAN: Judul kolom diubah dan diatur rata tengah (text-center) 🔥 */}
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
                        <BookOpen size={60} className="text-slate-100" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Tidak Ada Mahasiswa di Antrean</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((item) => (
                    <tr key={item.sidang_request_id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all uppercase shadow-inner tracking-tighter relative overflow-hidden shrink-0 border border-slate-200">
                            {item.avatar_url ? (
                              <Image 
                                src={item.avatar_url} 
                                alt={item.nama || "User"} 
                                layout="fill" 
                                objectFit="cover" 
                              />
                            ) : (
                              item.nama.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tight">{item.nama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center text-xs font-bold text-slate-400 tabular-nums tracking-tighter">{item.npm}</td>
                      {/* 🔥 PERBAIKAN: Konten Judul Skripsi diatur rata tengah (text-center) 🔥 */}
                      <td className="px-8 py-8 text-center text-slate-600">
                        <p className="text-[13px] font-bold leading-relaxed line-clamp-1 mb-2 normal-case tracking-tight">"{item.judul}"</p>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 tracking-tighter">{item.bidang}</span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <Link href={`/kaprodi/penjadwalansidang?id=${item.seminar_request_id}&sidang_id=${item.sidang_request_id}`}>
                          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group/btn">
                            PROSES <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
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

      {/* 🔥 PERBAIKAN: Skeleton Judul Skripsi diatur rata tengah (text-center) dan disesuaikan lebarnya 🔥 */}
      <td className="px-8 py-8 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-4 w-full max-w-[250px] bg-slate-300 rounded-md"></div>
          <div className="h-4 w-2/3 max-w-[180px] bg-slate-200 rounded-md"></div>
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