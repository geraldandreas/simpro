"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, MessageSquare, User, ArrowRight, LayoutDashboard, Calendar, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 

// --- TYPES ---
interface DashboardStat {
  count: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface StudentData {
  id: string; // Proposal ID
  name: string;
  npm: string;
  status: string;
  pembimbing2: string;
}

export default function DashboardDosenPage() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { count: 0, label: "Mahasiswa Bimbingan", icon: <User size={24} />, color: "blue" },
    { count: 0, label: "Proposal Menunggu Persetujuan", icon: <ClipboardList size={24} />, color: "amber" }
  ]);
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dosenName, setDosenName] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("nama")
          .eq("id", user.id)
          .single();
        
        if (profile) setDosenName(profile.nama);

        const { data: bimbinganData, error } = await supabase
          .from("thesis_supervisors")
          .select(`
            proposal_id,
            role,
            proposal:proposals (
              id, judul, status,
              user:profiles ( nama, npm ),
              seminar_requests ( tipe, status )
            )
          `)
          .eq("dosen_id", user.id);
        
        if (error) throw error;

        const proposalIds = bimbinganData.map((b: any) => b.proposal_id);
        let supervisorsMap: Record<string, string> = {};
        
        if (proposalIds.length > 0) {
          const { data: allSupervisors } = await supabase
            .from("thesis_supervisors")
            .select(`
              proposal_id,
              dosen:profiles!thesis_supervisors_dosen_id_fkey ( nama )
            `)
            .in("proposal_id", proposalIds)
            .neq("dosen_id", user.id); 

          allSupervisors?.forEach((s: any) => {
            supervisorsMap[s.proposal_id] = s.dosen?.nama || "-";
          });
        }

        let countProposalWait = 0;
        const mappedStudents: StudentData[] = bimbinganData.map((item: any) => {
          const proposal = item.proposal;
          const mhs = proposal?.user;
          const seminar = proposal?.seminar_requests?.find((r: any) => r.tipe === 'seminar');

          let displayStatus = "Proses Bimbingan";
          if (proposal.status === "Menunggu Persetujuan Dosbing") {
            displayStatus = "Pengajuan Proposal";
            countProposalWait++;
          } else if (seminar) {
            if (['Menunggu Verifikasi', 'draft', 'Lengkap'].includes(seminar.status)) {
              displayStatus = "Proses Kesiapan Seminar";
            }
          }

          return {
            id: proposal.id,
            name: mhs?.nama || "Tanpa Nama",
            npm: mhs?.npm || "-",
            status: displayStatus,
            pembimbing2: supervisorsMap[proposal.id] || "-" 
          };
        });

        setStudents(mappedStudents);
        setStats([
          { count: mappedStudents.length, label: "Mahasiswa Bimbingan", icon: <User size={24} />, color: "blue" },
          { count: countProposalWait, label: "Proposal Menunggu Persetujuan", icon: <ClipboardList size={24} />, color: "amber" }
        ]);

      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Proses Kesiapan Seminar":
        return "bg-indigo-50 text-indigo-600 border-indigo-100"; 
      case "Pengajuan Proposal":
        return "bg-amber-50 text-amber-600 border-amber-100"; 
      case "Proses Bimbingan":
        return "bg-emerald-50 text-emerald-600 border-emerald-100"; 
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            
            {/* GREETING */}
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">
                Selamat Datang, 
              </h1>
              <p className="text-blue-600 text-3xl font-black tracking-tight uppercase mt-2">
                {dosenName || "Dosen Pembimbing"}.
              </p>
              <p className="text-slate-500 font-medium mt-3">Pantau progres konsultasi dan persetujuan mahasiswa bimbingan Anda secara real-time.</p>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-[2rem] p-8 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-8 group hover:scale-[1.02] transition-all duration-300">
                  <div className={`h-20 w-20 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 shadow-lg ${
                    stat.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-amber-500 text-white shadow-amber-200'
                  }`}>
                    {stat.icon}
                  </div>
                  <div>
                    <span className="text-5xl font-black text-slate-800 block leading-none mb-2">
                      {loading ? "..." : stat.count}
                    </span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">
                      {stat.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TABLE SECTION */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <LayoutDashboard size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Log Konsultasi Mahasiswa</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                      <th className="px-8 py-6">Mahasiswa</th>
                      <th className="px-8 py-6 text-center">NPM</th>
                      <th className="px-8 py-6 text-center">Status</th>
                      <th className="px-8 py-6">Co-Pembimbing</th>
                      <th className="px-8 py-6 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Sinkronisasi Data...</td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                           <div className="flex flex-col items-center gap-3 opacity-30">
                              <Calendar size={60} />
                              <p className="font-black uppercase tracking-widest text-sm">Belum ada data bimbingan</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      students.map((student, idx) => (
                        <tr key={idx} className="group hover:bg-blue-50/30 transition-all duration-300">
                          <td className="px-8 py-8">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner uppercase">
                                {student.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{student.name}</p>
                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1 italic">Mahasiswa Akhir</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-8 text-center">
                            <span className="text-xs font-bold text-slate-400 tracking-tighter tabular-nums">{student.npm}</span>
                          </td>
                          <td className="px-8 py-8 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadgeStyle(student.status)}`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="px-8 py-8">
                             <div className="flex items-center gap-2">
                                <User size={14} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight truncate max-w-[150px]">{student.pembimbing2}</span>
                             </div>
                          </td>
                          <td className="px-8 py-8 text-center">
                            <Link href={`/dosen/accproposal?id=${student.id}`}>
                              <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg active:scale-95 group/btn">
                                DETAIL <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sistem Informasi Manajemen Tugas Akhir v.1.0</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}