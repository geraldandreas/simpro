"use client";

import React from 'react';
import useSWR from 'swr'; // 🚀 Import SWR
import { 
  Users, 
  FileCheck, 
  Clock, 
  Calendar,
  LayoutDashboard,
  User,
  ArrowRight
} from 'lucide-react';
import { mapStatusToUI } from "@/lib/mapStatusToUI";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// --- INTERFACES ---
interface MahasiswaBimbingan {
  proposal_id: string;
  nama: string;
  npm: string;
  avatar_url?: string | null;
  uiStatusLabel: string;
  uiStatusColor: string;
  pembimbing2: string; 
}

// ================= FETCHER SWR =================
const fetchDashboardKaprodiData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch Profile Name
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Fetch Seminar Siap Dijadwalkan
  const { data: seminarData } = await supabase
    .from("seminar_requests")
    .select(`id, status, seminar_schedules ( id )`)
    .in("status", ["Disetujui", "Menunggu Penjadwalan"]);

  const totalSeminarSiap = (seminarData || []).filter(
    (s: any) => !s.seminar_schedules || s.seminar_schedules.length === 0
  ).length;

  // 3. Fetch Proposal Pending Review
  const { data: proposalData } = await supabase
    .from("proposals")
    .select(`id, thesis_supervisors ( id )`);

  const totalProposalPending = (proposalData || []).filter(
    (p: any) => !p.thesis_supervisors || p.thesis_supervisors.length === 0
  ).length;

  // 4. Fetch Mahasiswa Bimbingan Aktif
  const { data: bimbinganData, error } = await supabase
    .from("thesis_supervisors")
    .select(`
      proposal:proposals (
        id, status, status_lulus,
        user:profiles ( nama, npm , avatar_url),
        seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at, examiners(dosen_id), seminar_feedbacks(status_revisi) ),
        sidang:sidang_requests ( id, status ),
        docs:seminar_documents ( status ),
        supervisors:thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
        sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
      )
    `)
    .eq("dosen_id", user.id);

  if (error) throw error;

  // Filter Bimbingan Aktif (Diterima & Belum Lulus)
  const validBimbingan = (bimbinganData || []).filter((row: any) => {
    const p = row.proposal;
    if (!p) return false;
    return p.status === "Diterima" && p.status_lulus !== true && p.status !== "Lulus";
  });

  // Map Data Mahasiswa
  const mappedStudents: MahasiswaBimbingan[] = validBimbingan.map((row: any) => {
    const p = row.proposal;
    
    const activeSeminar = p.seminar?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] || null;
    
    const hasSidang = Array.isArray(p.sidang) && p.sidang.length > 0;
    const docs = p.docs || [];
    const verifiedCount = docs.filter((d: any) => d.status === 'Lengkap').length;

    let p1Count = 0;
    let p2Count = 0;
    p.supervisors?.forEach((sp: any) => {
      const count = p.sessions?.filter((s: any) => 
        s.dosen_id === sp.dosen_id && 
        s.kehadiran_mahasiswa === 'hadir' &&
        (s.session_feedbacks?.[0]?.status_revisi === "disetujui" || s.session_feedbacks?.[0]?.status_revisi === "revisi")
      ).length || 0;

      if (sp.role === "utama") p1Count = count;
      else if (sp.role === "pendamping") p2Count = count;
    });

    const approvedByAll = !!activeSeminar?.approved_by_p1 && !!activeSeminar?.approved_by_p2;
    const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

    const ui = mapStatusToUI({ 
      proposalStatus: p.status, 
      hasSeminar: !!activeSeminar,
      seminarStatus: activeSeminar?.status,
      hasSidang: hasSidang,
      verifiedDocsCount: verifiedCount,
      uploadedDocsCount: docs.length,
      isEligible: isEligible
    });

    let finalTahap = ui.label;

    if (activeSeminar) {
      const fbs = activeSeminar.seminar_feedbacks || [];
      const exms = activeSeminar.examiners || [];
      const totalDosen = exms.length + (p.supervisors?.length || 0);
      const totalAcc = fbs.filter((f: any) => f.status_revisi === 'diterima').length;
      
      const hasFeedback = fbs.length > 0;
      const isAllRevisiAcc = totalDosen > 0 && totalAcc >= totalDosen;

      if (activeSeminar.status === 'Selesai' || hasFeedback) {
        finalTahap = "Perbaikan Pasca Seminar"; 
        if (isAllRevisiAcc) finalTahap = "Pendaftaran Sidang Akhir";
      }
    }

    if (hasSidang) {
       const sidangStatus = p.sidang[0]?.status?.toLowerCase();
       if (sidangStatus === "menunggu_penjadwalan" || sidangStatus === "pending") {
         finalTahap = "Pendaftaran Sidang Skripsi";
       } else {
         finalTahap = "Sidang Skripsi";
       }
    }

    const partner = p.supervisors?.find((s: any) => s.dosen_id !== user.id);

    return {
      proposal_id: p.id,
      nama: p.user?.nama || "Tanpa Nama",
      npm: p.user?.npm || "-",
      avatar_url: p.user?.avatar_url || null,
      uiStatusLabel: finalTahap,
      uiStatusColor: ui.color,
      pembimbing2: partner?.profiles?.nama || "-" 
    };
  });

  return {
    dosenName: profile?.nama ?? "Kaprodi",
    totalSeminarSiap,
    totalProposalPending,
    totalBimbingan: mappedStudents.length,
    students: mappedStudents
  };
};

export default function DashboardKaprodiClient() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading } = useSWR(
    'dashboard_kaprodi_main', 
    fetchDashboardKaprodiData, 
    {
      revalidateOnFocus: true, // Refresh otomatis ketika user kembali ke tab browser
      refreshInterval: 60000   // Auto refresh per menit
    }
  );

  // Destructure cache data, berikan nilai default jika masih loading
  const dosenName = cache?.dosenName || "Dosen Pembimbing";
  const totalBimbingan = cache?.totalBimbingan || 0;
  const totalProposalPending = cache?.totalProposalPending || 0;
  const totalSeminarSiap = cache?.totalSeminarSiap || 0;
  const students = cache?.students || [];

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Pengajuan Proposal": return "bg-amber-100 text-amber-700 border-amber-200"; 
      case "Proses Bimbingan": return "bg-indigo-100 text-indigo-700 border-indigo-200"; 
      case "Persetujuan Seminar": return "bg-purple-100 text-purple-700 border-purple-200"; 
      case "Unggah Dokumen Seminar": return "bg-green-100 text-green-700 border-green-200";
      case "Verifikasi Berkas": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Seminar Hasil": return "bg-green-100 text-green-700 border-green-200";
      case "Perbaikan Pasca Seminar": return "bg-orange-100 text-orange-700 border-orange-200"; 
      case "Pendaftaran Sidang Akhir":
      case "Pendaftaran Sidang Skripsi": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Sidang Skripsi":
      case "Lulus": return "bg-emerald-100 text-emerald-700 border-emerald-200"; 
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] pb-12 font-sans text-slate-700">

      <main className="p-10 max-w-[1400px] w-full mx-auto">
        {/* 1. GREETING AREA */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
            Selamat Datang, 
          </h1>
          {isLoading && !cache ? (
             <div className="h-9 w-64 bg-slate-200 rounded-xl mt-2 animate-pulse"></div>
          ) : (
             <p className="text-blue-600 text-3xl font-black tracking-tight mt-2 ">
               {dosenName}.
             </p>
          )}
          <p className="text-slate-500 font-medium mt-4">
            Pantau perkembangan akademik dan bimbingan mahasiswa Anda hari ini.
          </p>
        </div>

        {/* 2. STATS CARDS AREA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 justify-items-center">
          <StatCard 
            count={totalBimbingan.toString()} 
            label="Mahasiswa" 
            subLabel="Bimbingan Aktif" 
            icon={<Users size={20} />} 
            color="blue" 
            isLoading={isLoading && !cache}
          />
          <StatCard
            count={totalProposalPending.toString()}
            label="Proposal"
            subLabel="Menunggu Review"
            icon={<FileCheck size={20} />}
            color="amber"
            isLoading={isLoading && !cache}
          />
          <StatCard
            count={totalSeminarSiap.toString()}
            label="Seminar"
            subLabel="Siap Dijadwalkan"
            icon={<Clock size={20} />}
            color="indigo"
            isLoading={isLoading && !cache}
          />
        </div>

        {/* 3. TABLE SECTION */}
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
                  <th className="px-8 py-6 text-center">Co-Pembimbing</th>
                  <th className="px-8 py-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && !cache ? (
                  <>
                    {[1, 2, 3].map((item) => (
                      <tr key={item} className="border-b border-slate-50">
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0"></div>
                            <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="h-3 w-20 bg-slate-200 rounded-full mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="h-7 w-32 bg-slate-200 rounded-full mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-2 animate-pulse">
                            <div className="w-4 h-4 bg-slate-200 rounded-full shrink-0"></div>
                            <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                           <div className="h-10 w-28 bg-slate-200 rounded-2xl mx-auto animate-pulse"></div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                       <div className="flex flex-col items-center gap-3 opacity-30">
                          <Calendar size={60} />
                          <p className="font-black uppercase tracking-widest text-sm">Belum ada data bimbingan aktif</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => (
                    <tr key={idx} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner uppercase overflow-hidden shrink-0">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt={student.nama} className="w-full h-full object-cover" />
                            ) : (
                              student.nama.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate tracking-tight ">{student.nama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="text-xs font-bold text-slate-400 tracking-tighter tabular-nums">{student.npm}</span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadgeStyle(student.uiStatusLabel)}`}>
                          {student.uiStatusLabel}
                        </span>
                      </td>
                     <td className="px-8 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <User size={16} className="text-slate-300 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-700 tracking-tight truncate max-w-[150px]">
                            {student.pembimbing2}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <Link href={`/kaprodi/detailmahasiswabimbingan?id=${student.proposal_id}`}>
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
          </div>
        </div>

      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function StatCard({ count, label, subLabel, icon, color, isLoading }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-white shadow-lg shadow-slate-200/50 
                    flex flex-col items-center justify-center text-center 
                    hover:-translate-y-1 transition-all duration-300 w-full">
      <div className={`p-4 rounded-2xl mb-6 border ${colors[color]}`}>
        {icon}
      </div>
      
      {isLoading ? (
        <div className="h-10 w-16 bg-slate-200 rounded-xl animate-pulse mt-1 mb-1"></div>
      ) : (
        <span className="text-4xl font-black text-slate-800 tracking-tighter">
          {count}
        </span>
      )}
      
      <p className="text-sm font-bold text-slate-800 mt-1">
        {label}
      </p>
      <p className="text-[10px] font-black text-slate-400 tracking-widest mt-2">
        {subLabel}
      </p>
    </div>
  );
}