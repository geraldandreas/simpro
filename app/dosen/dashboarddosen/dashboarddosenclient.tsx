"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { User, ArrowRight, LayoutDashboard, Calendar, ClipboardList, Megaphone} from "lucide-react";
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
  avatar_url: string | null;
}

// ================= FETCHER SWR =================
const fetchDashboardDosenData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Jalankan multiple queries secara paralel agar lebih cepat
  const [profileRes, bannerRes, propDataRes, bimbinganRes] = await Promise.all([
    supabase.from("profiles").select("nama").eq("id", user.id).single(),
    supabase.from("broadcasts").select("judul, konten").eq("is_active", true).in("target_audiens", ["Semua (Dosen & Mahasiswa)", "Dosen Saja"]).maybeSingle(),
    supabase.from("proposals").select(`id, proposal_recommendations(dosen_id), thesis_supervisors(dosen_id)`),
    supabase.from("thesis_supervisors").select(`
        proposal_id,
        role,
        status,
        proposal:proposals (
          id, judul, status, status_lulus,
          user:profiles ( nama, npm, avatar_url ),
          seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at, examiners(dosen_id), seminar_feedbacks(status_revisi) ),
          sidang:sidang_requests ( id, status ), 
          docs:seminar_documents ( status ),
          supervisors:thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
          sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
        )
      `)
      .eq("dosen_id", user.id)
      .eq("status", "accepted")
  ]);

  const dosenName = profileRes.data?.nama || "";
  const bannerText = bannerRes.data ? `Pengumuman: ${bannerRes.data.judul} - ${bannerRes.data.konten}` : null;

  // 2. Hitung proposal yang menunggu respon (Pending Requests)
  let pendingRequestsCount = 0;
  if (propDataRes.data) {
    propDataRes.data.forEach((p: any) => {
      const isRecommended = p.proposal_recommendations?.some((r: any) => r.dosen_id === user.id);
      const hasResponded = p.thesis_supervisors?.some((s: any) => s.dosen_id === user.id);
      if (isRecommended && !hasResponded) {
        pendingRequestsCount++;
      }
    });
  }

  // 3. Mapping data mahasiswa bimbingan
  const rawStudents = (bimbinganRes.data || []).map((item: any) => {
    const p = item.proposal;
    if (!p) return null;
    
    // Sembunyikan yang sudah lulus
    if (p.status_lulus === true || p.status === "Lulus") return null; 

    // Sembunyikan status awal yang tidak aktif
    const inactiveStatuses = [
      "Pending", "Pengajuan Proposal", "Ditinjau Kaprodi", 
      "Menunggu Persetujuan Dosbing", "Ditolak Dosbing", "Ditolak", "Siap Ditetapkan"
    ];
    if (inactiveStatuses.includes(p.status)) return null; 
    
    // A. Ambil Seminar Request Terbaru
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
        (s.session_feedbacks?.[0]?.status_revisi === "disetujui" || s.session_feedbacks?.[0]?.status_revisi === "revisi")
      ).length || 0;

      if (sp.role === "utama") p1Count = count;
      else if (sp.role === "pendamping") p2Count = count;
    });

    // D. Tentukan Kelayakan (isEligible)
    const approvedByAll = !!activeSeminar?.approved_by_p1 && !!activeSeminar?.approved_by_p2;
    const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

    // E. Panggil Mapper Global
    const ui = mapStatusToUI({
      proposalStatus: p.status,
      hasSeminar: !!activeSeminar,
      seminarStatus: activeSeminar?.status,
      hasSidang: hasSidang,
      uploadedDocsCount: p.docs?.length || 0,
      verifiedDocsCount: verifiedDocsCount,
      isEligible: isEligible
    });

    // 🔥 LOGIKA OVERRIDE STATUS SINKRON DENGAN TENDIK/KAPRODI 🔥
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

    // 🔥 LOGIKA SIDANG (MENGECEK STATUS JADWAL) 🔥
    if (hasSidang) {
       const sidangStatus = p.sidang[0]?.status?.toLowerCase();
       
       if (sidangStatus === "lulus") {
         finalTahap = "Lulus";
       } else if (sidangStatus === "menunggu_penjadwalan" || sidangStatus === "pending") {
         finalTahap = "Pendaftaran Sidang Skripsi";
       } else {
         finalTahap = "Sidang Skripsi";
       }
    }

    // F. Cari Nama Partner Bimbingan (Co-Pembimbing)
    const partner = p.supervisors?.find((s: any) => s.dosen_id !== user.id);

    return {
      id: p.id,
      name: p.user?.nama || "Tanpa Nama",
      npm: p.user?.npm || "-",
      status: finalTahap, 
      pembimbing2: partner?.profiles?.nama || "-",
      avatar_url: p.user?.avatar_url || null
    };
  });

  const mappedStudents = rawStudents.filter(Boolean) as StudentData[];

  return {
    dosenName,
    bannerText,
    pendingRequestsCount,
    students: mappedStudents
  };
};


export default function DashboardDosenPage() {
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data, isLoading } = useSWR('dashboard_dosen_data', fetchDashboardDosenData, {
    revalidateOnFocus: true,
    refreshInterval: 60000 // auto-refresh setiap 1 menit
  });

  // Extract SWR data
  const dosenName = data?.dosenName || "";
  const bannerText = data?.bannerText || null;
  const students = data?.students || [];
  const pendingRequestsCount = data?.pendingRequestsCount || 0;

  const stats: DashboardStat[] = [
    { count: students.length, label: "Mahasiswa Bimbingan Aktif", icon: <User size={24} />, color: "blue" },
    { count: pendingRequestsCount, label: "Mahasiswa Mengajukan Anda Sebagai Pembimbing", icon: <ClipboardList size={24} />, color: "amber" }
  ];

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
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">

            {/* BANNER PENGUMUMAN BERJALAN */}
            {bannerText && (
              <div className="mb-10 max-w-5xl bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-5 shadow-md relative overflow-hidden">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-300 z-10">
                   <Megaphone size={20} className="text-white animate-pulse" />
                </div>
                
                <div className="flex-1 overflow-hidden relative">
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Pengumuman Terbaru</p>
                   <div className="animate-marquee whitespace-nowrap text-sm font-bold text-slate-700 flex">
                     <span>{bannerText}</span>
                     <span className="ml-16">{bannerText}</span>
                     <span className="ml-16">{bannerText}</span>
                   </div>
                </div>

                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
              </div>
            )}
            
            {/* GREETING */}
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                Selamat Datang, 
              </h1>
              {isLoading && !data ? (
                <div className="h-9 w-80 bg-blue-100 rounded-2xl animate-pulse mt-2"></div>
              ) : (
                <p className="text-blue-600 text-3xl font-black tracking-tight mt-2">
                  {dosenName || "Dosen Pembimbing"}.
                </p>
              )}
              <p className="text-slate-500 font-medium mt-3">
                Pantau progres konsultasi dan persetujuan mahasiswa bimbingan Anda secara real-time.
              </p>
            </div>

           {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] p-8 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-8">
                <div className={`h-20 w-20 rounded-[1.5rem] flex items-center justify-center shadow-lg ${
                  isLoading && !data ? 'bg-slate-100 text-slate-300 animate-pulse' : (stat.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-amber-500 text-white shadow-amber-200')
                }`}>
                  {stat.icon}
                </div>
                <div>
                  {isLoading && !data ? (
                    <div className="h-12 w-16 bg-slate-100 rounded-xl animate-pulse mb-3"></div>
                  ) : (
                    <span className="text-5xl font-black text-slate-800 block leading-none mb-2">{stat.count}</span>
                  )}
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] max-w-[200px] block leading-tight">
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
                    {isLoading && !data ? (
                      <>
                        {[1, 2, 3, 4, 5].map((item) => (
                          <tr key={item} className="animate-pulse">
                            <td className="px-8 py-8">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0"></div>
                                <div className="h-4 w-40 bg-slate-100 rounded-lg"></div>
                              </div>
                            </td>
                            <td className="px-8 py-8">
                              <div className="h-4 w-24 bg-slate-50 rounded-lg mx-auto"></div>
                            </td>
                            <td className="px-8 py-8">
                              <div className="h-8 w-32 bg-slate-100 rounded-full mx-auto"></div>
                            </td>
                            <td className="px-8 py-8">
                              <div className="h-4 w-32 bg-slate-50 rounded-lg"></div>
                            </td>
                            <td className="px-8 py-8 text-center">
                              <div className="h-10 w-28 bg-slate-100 rounded-2xl mx-auto"></div>
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
                                  <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  student.name.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 truncate tracking-tight">{student.name}</p>
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
                                <span className="text-xs font-bold text-slate-600 tracking-tight truncate max-w-[150px]">{student.pembimbing2}</span>
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}