// app/tendik/manajemenakun/page.tsx
"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import SidebarTendik from '@/components/sidebar-tendik';
import NotificationBell from '@/components/notificationBell';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, Trash2, User, GraduationCap, Clock, AlertCircle, ShieldCheck, ChevronRight
} from 'lucide-react';
import Image from 'next/image';

// ================= FETCHER SWR =================
const fetchMahasiswa = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nama, npm, email, avatar_url,
      proposal:proposals(status)
    `)
    .eq('role', 'mahasiswa')
    .order('nama', { ascending: true });

  if (error) throw error;

  return data.map((user: any) => {
    const prop = Array.isArray(user.proposal) ? user.proposal[0] : user.proposal;
    return {
      ...user,
      status_skripsi: prop?.status || 'Belum Mengajukan'
    };
  });
};

export default function ManajemenAkunTendik() {
  const { data: students, error, isLoading, mutate } = useSWR('tendik_manajemen_akun', fetchMahasiswa, { revalidateOnFocus: true });
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status"); 
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ================= FUNGSI HAPUS AKUN =================
  const handleDeleteAccount = async (userId: string, name: string) => {
    if (!confirm(`⚠️ PERINGATAN!\n\nApakah Anda yakin ingin menghapus akun mahasiswa "${name.toUpperCase()}" secara permanen?\n\nSemua data login dan profilnya akan musnah dari sistem.`)) return;

    try {
      setDeletingId(userId);
      
      const res = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert(`✅ Akun ${name} berhasil dihapus permanen dari sistem.`);
      mutate(); 

    } catch (err: any) {
      alert("❌ Gagal menghapus akun: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // 🔥 FILTER GANDA (NAMA/NPM + STATUS SKRIPSI)
  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || (s.npm && s.npm.includes(search));
    const matchesStatus = statusFilter === "Semua Status" ? true : s.status_skripsi === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      <SidebarTendik />
      
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-20">
          <div className="flex items-center gap-6"></div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase pr-6 mr-2 border-r border-slate-200">Simpro</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            
            <header className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Akun Mahasiswa</h1>
              <p className="text-slate-500 font-medium mt-1">Pantau status mahasiswa dan kelola akun yang telah menyelesaikan masa studinya.</p>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white overflow-hidden">
              
              {/* TOOLBAR BAWAH HEADER CARD (DISAMAKAN DENGAN DASHBOARD) */}
              <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Direktori Akun</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {filteredStudents.length} Mahasiswa</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {/* Search Bar */}
                  <div className="relative w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Nama/NPM..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative">
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white text-slate-700 text-[10px] font-black border border-slate-200 rounded-2xl pl-6 pr-10 py-3.5 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 cursor-pointer appearance-none transition-all min-w-[200px] shadow-sm uppercase tracking-widest"
                    >
                      <option value="Semua Status">Semua Status</option>
                      <option value="Lulus">Telah Lulus</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Belum Mengajukan">Belum Mengajukan</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={14} />
                  </div>
                </div>
              </div>

              {/* TABEL DATA */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black border-b border-slate-100">
                      <th className="py-6 px-8">Mahasiswa</th>
                      <th className="py-6 px-8 text-center">Status Skripsi</th>
                      <th className="py-6 px-8 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr><td colSpan={3} className="py-20 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Memuat Data...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={3} className="py-20 text-center font-black text-red-400 uppercase tracking-widest">Gagal memuat data</td></tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr><td colSpan={3} className="py-20 text-center font-black text-slate-400 uppercase tracking-widest">Tidak ada mahasiswa ditemukan</td></tr>
                    ) : (
                      filteredStudents.map((mhs) => {
                        const isLulus = mhs.status_skripsi === 'Lulus';

                        return (
                          <tr key={mhs.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                            
                            {/* KOLOM 1: PROFIL */}
                            <td className="py-8 px-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-white transition-all">
                                  {mhs.avatar_url ? <img src={mhs.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : <User size={20} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tighter">{mhs.nama}</p>
                                  <p className="text-[10px] font-bold text-slate-400 tracking-tighter mt-1.5">{mhs.npm || '-'}</p>
                                </div>
                              </div>
                            </td>

                            {/* KOLOM 2: STATUS SKRIPSI */}
                            <td className="py-8 px-8 text-center">
                              <span className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                isLulus ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                mhs.status_skripsi === 'Diterima' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {mhs.status_skripsi}
                              </span>
                            </td>

                            {/* KOLOM 3: AKSI HAPUS (HANYA AKTIF JIKA LULUS) */}
                            <td className="py-8 px-8 text-right">
                              {isLulus ? (
                                <button 
                                  onClick={() => handleDeleteAccount(mhs.id, mhs.nama)}
                                  disabled={deletingId === mhs.id}
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {deletingId === mhs.id ? <Clock size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  {deletingId === mhs.id ? 'Memproses...' : 'Hapus Akun'}
                                </button>
                              ) : (
                                <button disabled className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed">
                                  <AlertCircle size={14} /> Belum Lulus
                                </button>
                              )}
                            </td>

                          </tr>
                        );
                      })
                    )}
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