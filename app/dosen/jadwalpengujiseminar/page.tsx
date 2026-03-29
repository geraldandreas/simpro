"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ChevronRight,
  MapPin,
  User 
} from "lucide-react";
import NotificationBell from '@/components/notificationBell'; 
import { supabase } from "@/lib/supabaseClient";

// ================= TYPES =================
interface ScheduleItem {
  id_request: string;
  tanggal: string;
  jam: string;
  ruangan: string;
  mahasiswa: {
    nama: string;
    npm: string;
    avatar_url: string | null;
  };
  judul_proposal: string;
  role_saya: string; // Tambahan untuk membedakan Pembimbing atau Penguji
}

export default function JadwalPengujiDosenClient() {
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

      // 🔥 1. CARI SEBAGAI PENGUJI 🔥
      const { data: examinerAssignments } = await supabase
        .from('examiners')
        .select('seminar_request_id')
        .eq('dosen_id', user.id);

      // 🔥 2. CARI SEBAGAI PEMBIMBING 🔥
      const { data: supervisorAssignments } = await supabase
        .from('thesis_supervisors')
        .select('proposal_id')
        .eq('dosen_id', user.id);

      const reqIdsFromExaminer = examinerAssignments?.map(a => a.seminar_request_id) || [];
      const propIdsFromSupervisor = supervisorAssignments?.map(a => a.proposal_id) || [];

      // Jika tidak jadi penguji DAN tidak jadi pembimbing, kosongkan
      if (reqIdsFromExaminer.length === 0 && propIdsFromSupervisor.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      // 🔥 3. TARIK SEMUA SEMINAR YANG AKTIF 🔥
      const { data: allRequests, error: reqError } = await supabase
        .from('seminar_requests')
        .select(`
          id, 
          proposal_id,
          schedule:seminar_schedules ( tanggal, jam, ruangan ),
          proposal:proposals ( 
            judul, 
            user:profiles ( nama, npm, avatar_url )
          )
        `)
        .in('status', ['Disetujui', 'Selesai', 'Dijadwalkan']);

      if (reqError) throw reqError;

      // 🔥 4. FILTER MENGGUNAKAN JAVASCRIPT (Anti-Bug) 🔥
      const myRequests = (allRequests || []).filter((req: any) => 
        reqIdsFromExaminer.includes(req.id) || propIdsFromSupervisor.includes(req.proposal_id)
      );

      const mappedData = myRequests.map((reqDetail: any) => {
        const sched = Array.isArray(reqDetail.schedule) ? reqDetail.schedule[0] : reqDetail.schedule;
        const prop = Array.isArray(reqDetail.proposal) ? reqDetail.proposal[0] : reqDetail.proposal;
        const userData = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;
        
        // Tentukan Label Role
        let myRole = "Penguji";
        if (propIdsFromSupervisor.includes(reqDetail.proposal_id)) {
            myRole = "Pembimbing";
        }

        return {
          id_request: reqDetail.id,
          tanggal: sched?.tanggal || "", 
          jam: sched?.jam || "",
          ruangan: sched?.ruangan || "TBA",
          mahasiswa: {
            nama: userData?.nama || "Mahasiswa",
            npm: userData?.npm || "-",
            avatar_url: userData?.avatar_url || null,
          },
          judul_proposal: prop?.judul || "Judul belum tersedia",
          role_saya: myRole
        };
      });

      const finalData = mappedData.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
      
      setSchedules(finalData as ScheduleItem[]);
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
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Jadwal Penilaian & Menguji</h1>
                <p className="text-slate-500 font-medium mt-1">Halaman khusus penilaian dan revisi seminar.</p>
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
                      <th className="py-6 px-10 text-center">Tugas Anda</th>
                      <th className="py-6 px-10 text-center">Jadwal & Ruangan</th>
                      <th className="py-6 px-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={5} className="py-20 text-center animate-pulse font-black text-slate-300">SINKRONISASI DATA...</td></tr>
                    ) : filteredSchedules.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center font-black text-slate-400 uppercase tracking-widest">TIDAK ADA JADWAL MENGUJI/MENILAI</td></tr>
                    ) : filteredSchedules.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/80 transition-all cursor-default">
                        <td className="py-8 px-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl border-4 border-slate-50 bg-slate-100 flex items-center justify-center font-black text-slate-300 text-lg uppercase overflow-hidden relative shrink-0 transition-all group-hover:bg-blue-600 group-hover:text-white shadow-sm group-hover:shadow-blue-200">
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
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-widest">{item.mahasiswa.npm}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-8 px-10">
                          <p className="text-[13px] font-bold text-slate-600 leading-relaxed italic line-clamp-2 max-w-md">"{item.judul_proposal}"</p>
                        </td>

                        <td className="py-8 px-10 text-center">
                           <span className={`inline-block px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                             item.role_saya === 'Pembimbing' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                           }`}>
                             {item.role_saya}
                           </span>
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
                          {/* 🔥 PASTIKAN ROUTING MENGARAH KE FOLDER DETAIL (DOSEN) 🔥 */}
                          <button 
                            onClick={() => router.push(`/dosen/jadwalmengujiseminar?id=${item.id_request}`)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg group/btn"
                          >
                            Lihat Detail
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