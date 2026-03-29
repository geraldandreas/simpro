"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ChevronRight,
  MapPin
} from "lucide-react";
import NotificationBell from '@/components/notificationBell'; 
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface ScheduleItem {
  id_request: string; // ID dari sidang_requests
  tanggal: string;
  jam: string;
  ruangan: string;
  mahasiswa: {
    nama: string;
    npm: string;
    avatar_url: string | null;
  };
  judul_proposal: string;
}

export default function JadwalPengujiSidangDosenClient() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 🔥 LOGIKA BARU: Cari jadwal sidang di mana dosen ini jadi penguji 1, 2, atau 3
      const { data: sidangData, error } = await supabase
        .from('sidang_requests')
        .select(`
          id,
          tanggal_sidang,
          jam_sidang,
          ruangan,
          proposal:proposals (
            judul,
            user:profiles ( nama, npm, avatar_url )
          )
        `)
        .in('status', ['dijadwalkan', 'Selesai']) // Ambil yang sudah dijadwalkan kaprodi
        .or(`penguji1.eq.${user.id},penguji2.eq.${user.id},penguji3.eq.${user.id}`);

      if (error) throw error;

      if (!sidangData || sidangData.length === 0) {
        setSchedules([]);
        setLoading(false);
        return; 
      }

      // Map data sesuai format state ScheduleItem
      const mappedData: ScheduleItem[] = sidangData.map((item: any) => {
        const prop = Array.isArray(item.proposal) ? item.proposal[0] : item.proposal;
        const userData = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;
        
        return {
          id_request: item.id,
          tanggal: item.tanggal_sidang || "", 
          jam: item.jam_sidang || "",
          ruangan: item.ruangan || "TBA",
          mahasiswa: {
            nama: userData?.nama || "Mahasiswa",
            npm: userData?.npm || "-",
            avatar_url: userData?.avatar_url || null,
          },
          judul_proposal: prop?.judul || "Judul belum tersedia",
        };
      });

      // Urutkan berdasarkan tanggal terdekat
      const finalData = mappedData.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
      
      setSchedules(finalData);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false); 
    }
  };

  const getFormattedDate = (dateString: string) => {
    if (!dateString) return "TBA";
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
  };

  const filteredSchedules = schedules.filter(s => 
    s.mahasiswa.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.mahasiswa.npm.includes(searchTerm)
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-[1400px] mx-auto w-full"> 
            
            <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Jadwal Menguji Sidang</h1>
                <p className="text-slate-500 font-medium mt-1">Halaman khusus penilaian dan persetujuan sidang akhir skripsi.</p>
              </div>
              
              <div className="relative w-full md:w-[24rem]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari Mahasiswa..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border-none shadow-xl shadow-slate-200/50 rounded-2xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black border-b border-slate-50">
                      <th className="py-6 px-10">Mahasiswa</th>
                      <th className="py-6 px-10">Judul Skripsi</th>
                      <th className="py-6 px-10 text-center">Jadwal & Ruangan</th>
                      <th className="py-6 px-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="py-20 text-center animate-pulse font-black text-slate-300 tracking-widest uppercase text-xs">SINKRONISASI DATA...</td></tr>
                    ) : filteredSchedules.length === 0 ? (
                      <tr><td colSpan={4} className="py-20 text-center font-bold text-slate-400">Belum ada jadwal menguji sidang.</td></tr>
                    ) : filteredSchedules.map((item) => (
                      <tr key={item.id_request} className="group hover:bg-slate-50/80 transition-all">
                        <td className="py-8 px-10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase overflow-hidden relative shrink-0 transition-all group-hover:bg-blue-600 group-hover:text-white">
                              {item.mahasiswa.avatar_url ? (
                                <Image 
                                  src={item.mahasiswa.avatar_url} 
                                  alt="Ava" 
                                  fill 
                                  className="object-cover" 
                                />
                              ) : (
                                item.mahasiswa.nama.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.mahasiswa.nama}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.mahasiswa.npm}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-8 px-10">
                          <p className="text-[13px] font-bold text-slate-600 leading-relaxed italic line-clamp-2 max-w-md">"{item.judul_proposal}"</p>
                        </td>

                        <td className="py-8 px-10 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{getFormattedDate(item.tanggal)}</span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                              <span>{item.jam ? item.jam.substring(0, 5) : "--:--"}</span>
                              <span className="w-1 h-1 rounded-full bg-blue-200"></span>
                              <span className="flex items-center gap-1 uppercase"><MapPin size={10} /> {item.ruangan}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-8 px-10 text-center">
                          {/* Nanti URL disesuaikan dengan halaman detail penilaian sidang */}
                          <button 
                          onClick={() => router.push(`/dosen/detailmengujisidang?id=${item.id_request}`)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg group/btn"
                          >
                            Mulai Penilaian
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}