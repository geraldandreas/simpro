"use client";

import React, { useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ArrowRight,
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
  role_saya: string; 
}

// ================= FETCHER SWR =================
const fetchJadwalPengujiDosen = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [ { data: examinerAssignments }, { data: supervisorAssignments } ] = await Promise.all([
    supabase.from('examiners').select('seminar_request_id').eq('dosen_id', user.id),
    supabase.from('thesis_supervisors').select('proposal_id').eq('dosen_id', user.id)
  ]);

  const reqIdsFromExaminer = examinerAssignments?.map(a => a.seminar_request_id) || [];
  const propIdsFromSupervisor = supervisorAssignments?.map(a => a.proposal_id) || [];

  if (reqIdsFromExaminer.length === 0 && propIdsFromSupervisor.length === 0) {
    return [];
  }

  const { data: allRequests, error: reqError } = await supabase
    .from('seminar_requests')
    .select(`
      id, 
      proposal_id,
      schedule:seminar_schedules ( tanggal, jam, ruangan ),
      proposal:proposals ( 
        judul, status, status_lulus,
        user:profiles ( nama, npm, avatar_url )
      )
    `)
    .in('status', ['Disetujui', 'Selesai', 'Dijadwalkan']);

  if (reqError) throw reqError;

  const myRequests = (allRequests || []).filter((req: any) => {
    // 🔥 FILTER LULUS: Cek apakah mahasiswa ini sudah lulus
    const prop = Array.isArray(req.proposal) ? req.proposal[0] : req.proposal;
    const isLulus = prop?.status_lulus === true || prop?.status === "Lulus";
    
    // Jika sudah lulus, lewati
    if (isLulus) return false;

    // Jika belum lulus, cek apakah dosen ini adalah penguji atau pembimbingnya
    return reqIdsFromExaminer.includes(req.id) || propIdsFromSupervisor.includes(req.proposal_id);
  });

  const mappedData = myRequests.map((reqDetail: any) => {
    const sched = Array.isArray(reqDetail.schedule) ? reqDetail.schedule[0] : reqDetail.schedule;
    const prop = Array.isArray(reqDetail.proposal) ? reqDetail.proposal[0] : reqDetail.proposal;
    const userData = Array.isArray(prop?.user) ? prop.user[0] : prop?.user;
    
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
    } as ScheduleItem;
  });

  const finalData = mappedData.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  return finalData;
};

export default function JadwalPengujiDosenClient() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: schedules = [], isLoading } = useSWR(
    'jadwal_menguji_seminar_dosen_list',
    fetchJadwalPengujiDosen,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

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

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full"> 
            
            <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Jadwal Penilaian & Menguji</h1>
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

            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="py-6 px-8 w-[25%]">MAHASISWA</th>
                      <th className="py-6 px-8 w-[35%] text-center">JUDUL SKRIPSI</th>
                      <th className="py-6 px-8 text-center w-[15%]">TUGAS ANDA</th>
                      <th className="py-6 px-8 text-center w-[15%]">JADWAL & RUANGAN</th>
                      <th className="py-6 px-8 text-center w-[10%]">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      /* 🔥 SKELETON LOADER DISAMAKAN DENGAN AKSES PROPOSAL 🔥 */
                      <>
                        {[1, 2, 3, 4, 5].map((item) => (
                          <tr key={item} className="animate-pulse">
                            <td className="py-8 px-8">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>
                                <div className="space-y-3 flex-1">
                                  <div className="h-3 w-32 bg-slate-100 rounded-full"></div>
                                  <div className="h-2 w-20 bg-slate-50 rounded-full"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="flex flex-col items-center gap-2 px-6">
                                <div className="h-2.5 w-full max-w-[280px] bg-slate-100 rounded-full"></div>
                                <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-50 rounded-full"></div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-6 w-20 bg-slate-100 rounded-lg mx-auto"></div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-3 w-24 bg-slate-100 rounded-full"></div>
                                <div className="h-6 w-32 bg-slate-50 rounded-lg"></div>
                              </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                              <div className="h-10 w-28 bg-slate-100 rounded-xl mx-auto"></div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <User size={48} className="text-slate-100" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">TIDAK ADA JADWAL MENGUJI/MENILAI</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSchedules.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-blue-50/30 transition-all duration-300">
                        {/* 🔥 BAGIAN PROFIL MAHASISWA DISAMAKAN DENGAN AKSES PROPOSAL 🔥 */}
                        <td className="py-8 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all relative overflow-hidden shrink-0 border border-slate-200 uppercase bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white">
                              {item.mahasiswa.avatar_url ? (
                                <Image 
                                  src={item.mahasiswa.avatar_url} 
                                  alt={item.mahasiswa.nama || "User"} 
                                  layout="fill" 
                                  objectFit="cover" 
                                />
                              ) : (
                                item.mahasiswa.nama.charAt(0) || "?"
                              )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tight">
                                    {item.mahasiswa.nama ?? "-"}
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-black tracking-widest">{item.mahasiswa.npm ?? "-"}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-8 px-8 text-center">
                          <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 normal-case tracking-tight">"{item.judul_proposal}"</p>
                        </td>

                        <td className="py-8 px-8 text-center">
                           <span className={`inline-flex items-center justify-center text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap ${
                             item.role_saya === 'Pembimbing' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                           }`}>
                             {item.role_saya}
                           </span>
                        </td>

                        <td className="py-8 px-8 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{getFormattedDate(item.tanggal)}</span>
                            <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                              <span>{item.jam ? item.jam.substring(0, 5) : "--:--"}</span>
                              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
                              <span className="flex items-center gap-1 uppercase"><MapPin size={10} /> {item.ruangan}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-8 px-8 text-center">
                          <button 
                            onClick={() => router.push(`/dosen/jadwalmengujiseminar?id=${item.id_request}`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group/btn"
                          >
                         DETAIL
                             <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isLoading && (
                <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center mt-auto">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Terdata: {filteredSchedules.length} Jadwal Aktif</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}