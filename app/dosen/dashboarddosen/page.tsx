"use client";

import React, { useEffect, useState } from "react";
import { User, ArrowRight, LayoutDashboard, Calendar, ClipboardList } from "lucide-react";
import { mapStatusToUI } from "@/lib/mapStatusToUI";
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

// ... (imports tetap sama)

export default function DashboardDosenPage() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { count: 0, label: "Mahasiswa bimbingan", icon: <User size={24} />, color: "blue" },
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

    // 1. FETCH DATA DENGAN RELASI MENDALAM (IDENTIK DENGAN KAPRODI)
    const { data: bimbinganData, error } = await supabase
      .from("thesis_supervisors")
      .select(`
        proposal_id,
        role,
        proposal:proposals (
          id, judul, status,
          user:profiles ( nama, npm ),
          seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at ),
          sidang:sidang_requests ( id ),
          docs:seminar_documents ( status ),
          supervisors:thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
          sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
        )
      `)
      .eq("dosen_id", user.id);
    
    if (error) throw error;

    let countProposalWait = 0;

    const mappedStudents: StudentData[] = (bimbinganData || []).map((item: any) => {
      const p = item.proposal;
      
      // A. Ambil Seminar Request Terbaru (Mencegah data duplikat FALSE)
      const activeSeminar = p.seminar?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

      // B. Cek Sidang & Berkas
      const hasSidang = Array.isArray(p.sidang) && p.sidang.length > 0;
      const verifiedDocsCount = p.docs?.filter((d: any) => d.status === 'Lengkap').length || 0;

      // C. Hitung Bimbingan P1 (Utama) & P2 (Pendamping)
      let p1Count = 0;
      let p2Count = 0;
      p.supervisors?.forEach((sp: any) => {
        const count = p.sessions?.filter((s: any) => 
          s.dosen_id === sp.dosen_id && 
          s.kehadiran_mahasiswa === 'hadir' &&
          s.session_feedbacks?.[0]?.status_revisi === "disetujui"
        ).length || 0;

        if (sp.role === "utama") p1Count = count;
        else if (sp.role === "pendamping") p2Count = count;
      });

      // D. Tentukan Kelayakan (isEligible)
      const approvedByAll = !!activeSeminar?.approved_by_p1 && !!activeSeminar?.approved_by_p2;
      const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

      // E. Panggil Mapper Global (IDENTIK DENGAN DASHBOARD LAIN)
      const ui = mapStatusToUI({
        proposalStatus: p.status,
        hasSeminar: !!activeSeminar,
        seminarStatus: activeSeminar?.status,
        hasSidang: hasSidang,
        uploadedDocsCount: p.docs?.length || 0,
        verifiedDocsCount: verifiedDocsCount,
        isEligible: isEligible
      });

      if (p.status === "Menunggu Persetujuan Dosbing") countProposalWait++;

      // F. Cari Nama Partner Bimbingan (Co-Pembimbing)
      const partner = p.supervisors?.find((s: any) => s.dosen_id !== user.id);

      return {
        id: p.id,
        name: p.user?.nama || "Tanpa Nama",
        npm: p.user?.npm || "-",
        status: ui.label, // Status Label sekarang sinkron
        pembimbing2: partner?.profiles?.nama || "-" 
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
      case "Sidang Skripsi":
      case "Seminar Hasil": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Perbaikan Pasca Seminar": return "bg-orange-50 text-orange-600 border-orange-100";
      case "Proses Kesiapan Seminar":
      case "Verifikasi Berkas":
      case "Unggah Dokumen Seminar": return "bg-blue-50 text-blue-600 border-blue-100"; 
      case "Pengajuan Proposal": return "bg-amber-50 text-amber-600 border-amber-100"; 
      case "Proses Bimbingan": return "bg-indigo-50 text-indigo-600 border-indigo-100"; 
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  // ... (render logic tetap sama)

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
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Daftar Mahasiswa Bimbingan</h2>
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
                            <Link href={`/dosen/detailmahasiswabimbingan?id=${student.id}`}>
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