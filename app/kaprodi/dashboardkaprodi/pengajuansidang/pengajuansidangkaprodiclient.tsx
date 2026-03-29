"use client";

import { useEffect, useState } from "react";
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
  sidang_request_id: string; // ID Utama dari sidang_requests
  seminar_request_id: string; 
  nama: string;
  npm: string;
  avatar_url?: string | null;
  judul: string;
  bidang: string;
  file_name: string;
}

export default function PengajuanSidangKaprodiClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        /**
         * PERBAIKAN QUERY:
         * Sekarang Kaprodi membaca langsung dari "sidang_requests" (karena data di-insert ke sana)
         */
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
          .in('status', ['menunggu_penjadwalan']) // Ambil yang baru diajukan mahasiswa
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
              file_name: "Dokumen Sidang Lengkap (Tervalidasi Tendik)" // File sekarang ada di dashboard Tendik
            };
          });
        
        setStudents(mapped);
      } catch (err) {
        console.error("Gagal fetch data antrean sidang:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      {/* HEADER */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
         <div className="flex items-center gap-6"></div>
         <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
               Simpro
            </span>
         </div>
      </header>
      
      {/* MAIN CONTENT */}
      <main className="p-10 max-w-[1400px] mx-auto w-full">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">Penjadwalan Sidang Akhir</h1>
            <p className="text-slate-500 font-medium mt-3">Daftar mahasiswa yang sudah divalidasi berkasnya oleh Tendik dan siap dijadwalkan.</p>
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
                  <th className="px-8 py-6 w-[35%]">Judul & Status Berkas</th>
                  <th className="px-8 py-6 w-[13%] text-center">Bidang</th>
                  <th className="px-8 py-6 w-[15%] text-center">Tindakan</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Sinkronisasi Data...</td></tr>
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
                            <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tight">{item.nama}</p>
                            <p className="text-[10px] text-blue-500 font-bold uppercase flex items-center gap-1.5 mt-2 tracking-tight"><User size={10} /> Mahasiswa Akhir</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center text-xs font-bold text-slate-400 tabular-nums tracking-tighter">{item.npm}</td>
                      <td className="px-8 py-8 italic text-slate-600">
                        <p className="text-[13px] font-bold leading-relaxed line-clamp-1 mb-2 normal-case tracking-tight">"{item.judul}"</p>
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit border border-emerald-100 uppercase tracking-widest shadow-sm not-italic">
                          <ShieldCheck size={12} /> {item.file_name}
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 tracking-tighter">{item.bidang}</span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        {/* URL DIUBAH AGAR MENGIRIM SIDANG_ID BUKAN LAGI REV_ID */}
                        <Link href={`/kaprodi/dashboardkaprodi/penjadwalansidang?id=${item.seminar_request_id}&sidang_id=${item.sidang_request_id}`}>
                          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group/btn">
                            PROSES SIDANG <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
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