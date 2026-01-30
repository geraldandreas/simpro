"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar-dosen"; 
import { Search, Bell, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; 

// --- TYPES ---
interface DashboardStat {
  count: number;
  label: string;
  desc: string;
}

interface StudentData {
  id: string; // Proposal ID
  name: string;
  npm: string;
  status: string;
  pembimbing2: string;
}

export default function DashboardDosenPage() {
  // State for Stats (Hapus item seminar)
  const [stats, setStats] = useState<DashboardStat[]>([
    { count: 0, label: "Mahasiswa Bimbingan", desc: "Mahasiswa Bimbingan" },
    { count: 0, label: "Proposal Menunggu Persetujuan", desc: "Proposal Menunggu Persetujuan" }
  ]);
  
  // State for Table
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for User Name
  const [dosenName, setDosenName] = useState<string>("");

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Get Current User (Dosen)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1b. Fetch User Profile Name
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setDosenName(profile.nama);
        }

        // 2. Fetch Supervised Students
        const { data: bimbinganData, error } = await supabase
          .from("thesis_supervisors")
          .select(`
            proposal_id,
            role,
            proposal:proposals (
              id,
              judul,
              status,
              user:profiles!proposals_mahasiswa_id_fkey (
                nama,
                npm
              ),
              seminar_requests (
                tipe,
                status
              )
            )
          `)
          .eq("dosen_id", user.id);

        if (error) {
          console.error("Error fetching bimbingan:", error);
          throw error;
        }

        // 3. Fetch Partner Supervisors (Pembimbing 2 logic)
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

        // 4. Process Data for Stats & Table
        let countProposalWait = 0;

        const mappedStudents: StudentData[] = bimbinganData.map((item: any) => {
          const proposal = item.proposal;
          const mhs = proposal?.user;
          
          const seminar = proposal?.seminar_requests?.find((r: any) => r.tipe === 'seminar');

          // -- Status Logic --
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

        // 5. Update States (Hapus item seminar)
        setStudents(mappedStudents);
        setStats([
          { 
            count: mappedStudents.length, 
            label: "Mahasiswa Bimbingan", 
            desc: "Mahasiswa Bimbingan" 
          },
          { 
            count: countProposalWait, 
            label: "Proposal Menunggu Persetujuan",
            desc: "Proposal Menunggu Persetujuan"
          }
        ]);

      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper for Badge Colors
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Proses Kesiapan Seminar":
        return "bg-[#8CAEE3] text-white"; 
      case "Pengajuan Proposal":
        return "bg-[#E6CF95] text-white"; 
      case "Proses Bimbingan":
        return "bg-[#AEC0BA] text-white"; 
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8">
          <div className="relative w-96">
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-gray-400"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-gray-600">
              <MessageSquare size={22} />
            </button>
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell size={22} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="flex-1 p-8 bg-white">
          
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Selamat Datang, {dosenName || "Dosen Pembimbing"}.
          </h1>

          {/* STATS CARDS (Ubah ke grid-cols-2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="border border-gray-300 rounded-2xl p-8 flex flex-col justify-center items-center text-center h-48 hover:shadow-sm transition-shadow">
                <span className="text-4xl font-extrabold text-gray-900 mb-4">
                  {loading ? "..." : stat.count}
                </span>
                <span className="text-base font-semibold text-gray-900 max-w-[200px] leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* TABLE SECTION */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Mahasiswa Bimbingan</h2>
            
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-gray-200 text-left">
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Nama Mahasiswa</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">NPM</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Status</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Pembimbing 2</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Memuat data...
                      </td>
                    </tr>
                  )}

                  {!loading && students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Belum ada mahasiswa bimbingan.
                      </td>
                    </tr>
                  )}

                  {students.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-6 text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-900">
                        {student.npm}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${getStatusBadgeStyle(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-900">
                        {student.pembimbing2}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <Link href={`/dosen/accproposal?id=${student.id}`}>
                          <button className="bg-[#6AA495] hover:bg-[#588d7f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
                            Lihat Detail
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}