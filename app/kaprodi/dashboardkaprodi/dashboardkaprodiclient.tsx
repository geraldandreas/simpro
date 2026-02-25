"use client";

import React, {useState, useEffect} from 'react';
import NotificationBell from '@/components/notificationBell';
import { 
  Bell, 
  Search, 
  MessageSquare, 
  Users, 
  FileCheck, 
  Clock, 
  GraduationCap
} from 'lucide-react';


import { mapStatusToUI } from "@/lib/mapStatusToUI";

import Link from "next/link";
import {  
 
  User,
  ArrowRight,

} from "lucide-react";

interface MahasiswaBimbingan {
  proposal_id: string;
  nama: string;
  npm: string;
  uiStatusLabel: string;
  uiStatusColor: string;
}

import { supabase } from "@/lib/supabaseClient";

export default function DashboardKaprodiClient() {
  const [totalBimbingan, setTotalBimbingan] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [students, setStudents] = useState<MahasiswaBimbingan[]>([]);
  const [totalSeminarSiap, setTotalSeminarSiap] = useState(0);
 const [dosenName, setDosenName] = useState<string>("");



  
const [totalProposalPending, setTotalProposalPending] = useState(0);
const fetchSeminarSiap = async () => {
  try {
    const { data, error } = await supabase
      .from("seminar_requests")
      .select(`
        id,
        status,
        seminar_schedules ( id )
      `)
      .in("status", ["Disetujui", "Menunggu Penjadwalan"]);

    if (error) throw error;

    const siap = (data || []).filter(
      (s: any) =>
        !s.seminar_schedules || s.seminar_schedules.length === 0
    );

    setTotalSeminarSiap(siap.length);
  } catch (err) {
    console.error("❌ Gagal hitung seminar siap dijadwalkan:", err);
  }
};




const fetchProposalPending = async () => {
  try {
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        id,
        thesis_supervisors ( id )
      `);

    if (error) throw error;

    const pending = (data || []).filter(
      (p: any) => !p.thesis_supervisors || p.thesis_supervisors.length === 0
    );

    setTotalProposalPending(pending.length);
  } catch (err) {
    console.error("❌ Gagal hitung proposal pending:", err);
  }
};



 // ================= FETCH LOGIC (SINKRON DENGAN GLOBAL) =================

const fetchMahasiswaBimbingan = async (uid: string) => {
  try {
    const { data, error } = await supabase
      .from("thesis_supervisors")
      .select(`
        proposal:proposals (
          id, status,
          mahasiswa:profiles ( nama, npm ),
          seminar:seminar_requests ( status, approved_by_p1, approved_by_p2, created_at ),
          sidang:sidang_requests ( id ),
          docs:seminar_documents ( status ),
          supervisors:thesis_supervisors ( role, dosen_id ),
          sessions:guidance_sessions ( dosen_id, kehadiran_mahasiswa, session_feedbacks ( status_revisi ) )
        )
      `)
      .eq("dosen_id", uid);

    if (error) throw error;

    const mapped: MahasiswaBimbingan[] = (data || []).map((row: any) => {
      const p = row.proposal;
      
      // 1. Ambil Seminar Request Terbaru
      const activeSeminar = p.seminar?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;
      
      // 2. Cek Data Sidang
      const hasSidang = Array.isArray(p.sidang) && p.sidang.length > 0;

      // 3. Hitung Berkas Tervalidasi Tendik
      const docs = p.docs || [];
      const verifiedCount = docs.filter((d: any) => d.status === 'Lengkap').length;

      // 4. Hitung Bimbingan P1 (Utama) & P2 (Pendamping)
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

      // 5. Kelayakan (IsEligible)
      const approvedByAll = !!activeSeminar?.approved_by_p1 && !!activeSeminar?.approved_by_p2;
      const isEligible = p1Count >= 10 && p2Count >= 10 && approvedByAll;

      // 6. Panggil Mapper Global
      const ui = mapStatusToUI({ 
        proposalStatus: p.status, 
        hasSeminar: !!activeSeminar,
        seminarStatus: activeSeminar?.status,
        hasSidang: hasSidang,
        verifiedDocsCount: verifiedCount,
        uploadedDocsCount: docs.length,
        isEligible: isEligible
      });

      return {
        proposal_id: p.id,
        nama: p.mahasiswa.nama,
        npm: p.mahasiswa.npm,
        uiStatusLabel: ui.label,
        uiStatusColor: ui.color,
      };
    });

    setStudents(mapped);
  } catch (err) {
    console.error("❌ Gagal load mahasiswa bimbingan:", err);
  }
};
 

  const fetchStats = async (uid: string) => {
  try {
    const { count, error } = await supabase
      .from("thesis_supervisors")
      .select("*", { count: "exact", head: true })
      .eq("dosen_id", uid);

    if (error) throw error;
    setTotalBimbingan(count || 0);
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
};


useEffect(() => {
  const init = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ambil nama kaprodi
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", user.id)
        .maybeSingle();

      setDosenName(profile?.nama ?? "Kaprodi");

     await Promise.all([
  fetchStats(user.id),
  fetchProposalPending(),
  fetchSeminarSiap(),
  fetchMahasiswaBimbingan(user.id), 
]);


    } catch (err) {
      console.error("Dashboard kaprodi error:", err);
    } finally {
      setLoading(false);
    }
  };

  init();
}, []);


  // ... rest of your return code
  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FE] pb-12 font-sans text-slate-700">
      
      {/* TOP HEADER - Glassmorphism Effect */}
     <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
               <div className="flex items-center gap-6">
                 <div className="relative w-72 group">
                 </div>
               </div>
     
             <div className="flex items-center gap-6">
         {/* KOMPONEN LONCENG BARU */}
         <NotificationBell />
         
         <div className="h-8 w-[1px] bg-slate-200 mx-2" />
     
               <div className="flex items-center gap-6">
                 {/* Minimalist SIMPRO Text */}
                 <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                   Simpro
                 </span>
               </div>
               </div>
             </header>

      <main className="p-10 max-w-[1400px] w-full mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight"> Selamat Datang, {dosenName || "Dosen Pembimbing"}
          </h1>

          <p className="text-slate-500 font-medium mt-1">Pantau perkembangan akademik dan bimbingan mahasiswa Anda hari ini.</p>
        </div>

        {/* STATS CARDS - Improved with Icons & Depth */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 justify-items-center">
          <StatCard 
            count={loading ? "..." : totalBimbingan.toString()} 
            label="Mahasiswa" 
            subLabel="Bimbingan Aktif" 
            icon={<Users size={20} />} 
            color="blue" 
          />
          <StatCard
  count={loading ? "..." : totalProposalPending.toString()}
  label="Proposal"
  subLabel="Menunggu Review"
  icon={<FileCheck size={20} />}
  color="amber"
/>

          <StatCard
  count={loading ? "..." : totalSeminarSiap.toString()}
  label="Seminar"
  subLabel="Siap Dijadwalkan"
  icon={<Clock size={20} />}
  color="indigo"
/>

          
        </div>

        {/* TABLE SECTION - Improved Spacing & Design */}
        <section className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="lg:col-span-8 bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100">
                <User size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Daftar Mahasiswa
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-6">Mahasiswa</th>
                    <th className="px-8 py-6 text-center">Progres Skripsi</th>
                    <th className="px-8 py-6 text-center">Tindakan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold animate-pulse">
                        Menghubungkan ke database...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                        Belum ada mahasiswa bimbingan.
                      </td>
                    </tr>
                  ) : (
                    students.map((mhs) => (
                      <tr key={mhs.proposal_id} className="group hover:bg-blue-50/30 transition-all duration-300">
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {mhs.nama?.charAt(0) ?? "?"}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 leading-none">{mhs.nama}</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{mhs.npm}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-8 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${mhs.uiStatusColor}`}>
                            {mhs.uiStatusLabel}
                          </span>
                        </td>

                        <td className="px-8 py-8 text-center">
                          <Link
                            href={
                              mhs.uiStatusLabel === "Pengajuan Proposal"
                                ? `/kaprodi/dashboardkaprodi/accproposal?id=${mhs.proposal_id}`
                                : `/kaprodi/dashboardkaprodi/detailmahasiswabimbingan?id=${mhs.proposal_id}`
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                          >
                            Detail <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- IMPROVED SUB-COMPONENTS ---

function StatCard({ count, label, subLabel, icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-white shadow-lg shadow-slate-200/50 
                    flex flex-col items-center justify-center text-center 
                    hover:-translate-y-1 transition-all duration-300">
      
      {/* ICON */}
      <div className={`p-4 rounded-2xl mb-6 border ${colors[color]}`}>
        {icon}
      </div>

      {/* COUNT */}
      <span className="text-4xl font-black text-slate-800 tracking-tighter">
        {count}
      </span>

      {/* LABEL */}
      <p className="text-sm font-bold text-slate-800 uppercase mt-1">
        {label}
      </p>

      {/* SUBLABEL */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
        ● {subLabel}
      </p>
    </div>
  );
}


function TableRow({ name, npm, status, lecturer2, statusColor }: any) {
  return (
    <tr className="hover:bg-blue-50/30 transition-all duration-300 group">
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            {name.charAt(0)}
          </div>
          <p className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">{name}</p>
        </div>
      </td>
      <td className="px-8 py-6 text-center font-bold text-slate-400 text-xs tracking-tighter">{npm}</td>
      <td className="px-8 py-6 text-center">
        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-8 py-6">
        <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{lecturer2}</p>
      </td>
      <td className="px-8 py-6 text-center">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-95">
          DETAIL
        </button>
      </td>
    </tr>
  );
}