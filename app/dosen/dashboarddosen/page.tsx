"use client";

import React, { useEffect, useState } from "react";
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

export default function DashboardDosenPage() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { count: 0, label: "Mahasiswa Bimbingan Aktif", icon: <User size={24} />, color: "blue" },
    { count: 0, label: "Mahasiswa Mengajukan Anda Sebagai Pembimbing", icon: <ClipboardList size={24} />, color: "amber" }
  ]);
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dosenName, setDosenName] = useState<string>("");
  const [bannerText, setBannerText] = useState<string | null>(null);

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

        const { data: activeBanner } = await supabase
          .from("broadcasts")
          .select("judul, konten")
          .eq("is_active", true)
          .in("target_audiens", ["Semua (Dosen & Mahasiswa)", "Dosen Saja"])
          .maybeSingle();

        if (activeBanner) {
           // Menggabungkan Judul dan Konten untuk di-scroll
           setBannerText(`PENGUMUMAN: ${activeBanner.judul} - ${activeBanner.konten}`);
        }


        // =========================================================
        // 1. HITUNG PROPOSAL YANG MENUNGGU RESPON DOSEN INI
        // =========================================================
        const { data: propData } = await supabase
          .from("proposals")
          .select(`id, proposal_recommendations(dosen_id), thesis_supervisors(dosen_id)`);

        let pendingRequestsCount = 0;
        if (propData) {
          propData.forEach((p: any) => {
            const isRecommended = p.proposal_recommendations?.some((r: any) => r.dosen_id === user.id);
            const hasResponded = p.thesis_supervisors?.some((s: any) => s.dosen_id === user.id);
            // Hitung jika dia direkomendasikan TAPI belum menjawab
            if (isRecommended && !hasResponded) {
              pendingRequestsCount++;
            }
          });
        }

        // =========================================================
        // 2. FETCH DATA MAHASISWA BIMBINGAN (DENGAN ANTI-LEAK)
        // =========================================================
        const { data: bimbinganData, error } = await supabase
          .from("thesis_supervisors")
          .select(`
            proposal_id,
            role,
            status,
            proposal:proposals (
              id, judul, status,
              user:profiles ( nama, npm, avatar_url ),
              seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at ),
              sidang:sidang_requests ( id ),
              docs:seminar_documents ( status ),
              supervisors:thesis_supervisors ( role, dosen_id, profiles ( nama ) ),
              sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
            )
          `)
          .eq("dosen_id", user.id)
          .eq("status", "accepted"); // Hanya ambil yang sudah di-ACC Dosen
        
        if (error) throw error;

        const rawStudents = (bimbinganData || []).map((item: any) => {
          const p = item.proposal;

          // 🔥 PROTEKSI ANTI-LEAK: 
          // Cek apakah Kaprodi SUDAH menetapkan proposal ini
          const inactiveStatuses = [
            "Pending", "Pengajuan Proposal", "Ditinjau Kaprodi", 
            "Menunggu Persetujuan Dosbing", "Ditolak Dosbing", "Ditolak", "Siap Ditetapkan"
          ];
          
          if (!p || inactiveStatuses.includes(p.status)) {
            return null; // Abaikan dan jangan tampilkan di daftar
          }
          
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
              s.session_feedbacks?.[0]?.status_revisi === "disetujui"
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

          // F. Cari Nama Partner Bimbingan (Co-Pembimbing)
          const partner = p.supervisors?.find((s: any) => s.dosen_id !== user.id);

          return {
            id: p.id,
            name: p.user?.nama || "Tanpa Nama",
            npm: p.user?.npm || "-",
            status: ui.label,
            pembimbing2: partner?.profiles?.nama || "-",
            avatar_url: p.user?.avatar_url || null
          };
        });

        // Hapus elemen "null" akibat anti-leak filter
        const mappedStudents = rawStudents.filter(Boolean) as StudentData[];

        setStudents(mappedStudents);

        // =========================================================
        // 3. SET CARD STATISTIK
        // =========================================================
        setStats([
          { count: mappedStudents.length, label: "Mahasiswa Bimbingan Aktif", icon: <User size={24} />, color: "blue" },
          { count: pendingRequestsCount, label: "Mahasiswa Mengajukan Anda Sebagai Pembimbing", icon: <ClipboardList size={24} />, color: "amber" }
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

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">

            {/* 🔥 BANNER PENGUMUMAN BERJALAN (DESAIN BARU YANG RAPI) */}
            {bannerText && (
              <div className="mb-10 max-w-5xl bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-5 shadow-md relative overflow-hidden">
                {/* Ikon Statis */}
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-300 z-10">
                   <Megaphone size={20} className="text-white animate-pulse" />
                </div>
                
                {/* Area Teks */}
                <div className="flex-1 overflow-hidden relative">
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Pengumuman Terbaru</p>
                   {/* Teks Berjalan */}
                   <div className="animate-marquee whitespace-nowrap text-sm font-bold text-slate-700 flex">
                     <span>{bannerText}</span>
                     <span className="ml-16">{bannerText}</span>
                     <span className="ml-16">{bannerText}</span>
                   </div>
                </div>

                {/* Gradient Penutup (Biar teks hilangnya halus) */}
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
              </div>
            )}
            
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
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Sinkronisasi Data...</td>
                      </tr>
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
                              {/* 🔥 MERENDER FOTO PROFIL MAHASISWA JIKA ADA */}
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner uppercase overflow-hidden shrink-0">
                                {student.avatar_url ? (
                                  <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  student.name.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{student.name}</p>
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}