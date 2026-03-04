"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  TrendingUp, 
  UserCheck,
  Eye,
  Users
} from "lucide-react";
import Link from "next/link";
import NotificationBell from '@/components/notificationBell';
import { supabase } from "@/lib/supabaseClient";

// 1. Definisikan Interface untuk Typing yang kuat
interface DosenStat {
  id: string;
  nama: string;
  p1_count: number;
  p2_count: number;
  total_peminat: number;
  accepted_count: number; 
  active_students: number; 
}

export default function MonitoringBursaPage() {
  const [stats, setStats] = useState<DosenStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBursaData();
  }, []);

  const fetchBursaData = async () => {
    setLoading(true);
    try {
      // 1️⃣ Ambil semua dosen
      const { data: dosens } = await supabase
        .from("profiles")
        .select("id, nama")
        .in("role", ["dosen", "kaprodi"]);

      // 2️⃣ Ambil data peminat
      const { data: recs } = await supabase
        .from("proposal_recommendations")
        .select("dosen_id, tipe");

      // 3️⃣ Ambil supervisor + join proposal
      const { data: sups } = await supabase
        .from("thesis_supervisors")
        .select(`
          dosen_id,
          status,
          proposal_id,
          proposal:proposals (
            status
          )
        `);

      const finalStats = (dosens || []).map(d => {
        const p1 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing1").length || 0;
        const p2 = recs?.filter(r => r.dosen_id === d.id && r.tipe === "pembimbing2").length || 0;

        // Count: Disetujui (bursa accepted)
        const acc = sups?.filter(s => s.dosen_id === d.id && s.status === "accepted").length || 0;

        // 🔥 Logic Mhs Bimbingan (Eksisting/Aktif)
        // Menggunakan 'any' pada filter untuk menghindari error TS pada join nested
        const mahasiswaAktif = sups?.filter((s: any) => 
          s.dosen_id === d.id && s.proposal?.status === "Diterima"
        ) || [];

        const uniqueCount = new Set(mahasiswaAktif.map((s: any) => s.proposal_id)).size;

        return {
          id: d.id,
          nama: d.nama,
          p1_count: p1,
          p2_count: p2,
          total_peminat: p1 + p2,
          accepted_count: acc,
          active_students: uniqueCount
        };
      }).sort((a, b) => b.total_peminat - a.total_peminat);

      setStats(finalStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = stats.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
    <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em]">
      Memproses Data...
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      
      {/* Kolom Kanan: Header + Konten Utama */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group">
               {/* Ruang Kosong Kiri */}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationBell />
            
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
        
            <div className="flex items-center gap-6">
              <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                Simpro
              </span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT (Area yang bisa di-scroll) */}
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* JUDUL HALAMAN */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Bursa Dosbing</h1>
                <p className="text-slate-500 font-bold mt-3 uppercase tracking-widest text-[10px]">Monitoring Beban Kerja & Usulan Mahasiswa</p>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari nama dosen..." 
                  className="pl-12 pr-6 py-4 bg-white shadow-xl shadow-slate-200/50 rounded-2xl w-full md:w-96 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                 <TrendingUp className="absolute right-[-10px] bottom-[-10px] size-32 opacity-10 group-hover:scale-110 transition-transform" />
                 <p className="text-blue-100 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Peminat Terbanyak</p>
                 <h3 className="text-2xl font-black truncate">{stats[0]?.nama || "-"}</h3>
                 <p className="text-sm mt-1 opacity-80 font-bold">{stats[0]?.total_peminat || 0} Mahasiswa Tertarik</p>
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white flex flex-col justify-center">
                 <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Dosen Tanpa Peminat</p>
                 <h3 className="text-2xl font-black text-slate-800">
                    {stats.filter(s => s.total_peminat === 0).length} <span className="text-sm font-bold text-slate-400 uppercase">Dosen</span>
                 </h3>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosen Pengajar</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Peminat (P1/P2)</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Disetujui</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mhs Bimbingan</th>
                    <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((dosen) => (
                    <tr key={dosen.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-10 py-7">
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{dosen.nama}</p>
                      </td>
                      <td className="px-6 py-7 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-black text-[11px]">P1: {dosen.p1_count}</span>
                          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black text-[11px]">P2: {dosen.p2_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-7 text-center">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
                          <UserCheck size={16} />
                          {dosen.accepted_count}
                        </div>
                      </td>
                      <td className="px-6 py-7 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-700 font-black text-sm">
                          <Users size={16} className="text-slate-400" />
                          {dosen.active_students}
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <Link 
                          href={`/kaprodi/dashboardkaprodi/detailmanajemenbursa?id=${dosen.id}&nama=${encodeURIComponent(dosen.nama)}`}
                          className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 shadow-slate-200"
                        >
                          <Eye size={14} /> Lihat Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filtered.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm italic">
                  Data dosen tidak ditemukan
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}