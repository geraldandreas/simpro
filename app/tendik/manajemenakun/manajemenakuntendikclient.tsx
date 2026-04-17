// app/tendik/manajemenakun/page.tsx
"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, Trash2, User, Clock, AlertCircle, ChevronRight, ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ================= FETCHER SWR =================
const fetchMahasiswa = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nama, npm, email, avatar_url,
      proposal:proposals(status, status_lulus) 
    `) 
    .eq('role', 'mahasiswa')
    .order('nama', { ascending: true });

  if (error) throw error;

  return data.map((user: any) => {
    const prop = Array.isArray(user.proposal) ? user.proposal[0] : user.proposal;
    
    let finalStatus = 'Belum Mengajukan';
    if (prop) {
      if (prop.status_lulus === true || prop.status === 'Lulus') {
        finalStatus = 'Lulus'; 
      } else {
        finalStatus = prop.status || 'Belum Mengajukan';
      }
    }

    return {
      ...user,
      status_skripsi: finalStatus
    };
  });
};

export default function ManajemenAkunTendik() {
  // 🚀 IMPLEMENTASI SWR DENGAN REFRESH OTOMATIS
  const { data: students, error, isLoading, mutate } = useSWR(
    'tendik_manajemen_akun', 
    fetchMahasiswa, 
    { 
      revalidateOnFocus: true, // Refresh otomatis saat tab aktif kembali
      refreshInterval: 60000   // Auto-refresh data tiap 1 menit
    }
  );
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status"); 
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // ================= FUNGSI HAPUS AKUN =================
  const handleDeleteAccount = async (userId: string, name: string) => {
    if (!confirm(`PERINGATAN!\n\nApakah Anda yakin ingin menghapus akun mahasiswa "${name.toUpperCase()}" secara permanen?\n\nSemua data login dan profilnya akan hilang dari sistem.`)) return;

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

  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || (s.npm && s.npm.includes(search));
    const matchesStatus = statusFilter === "Semua Status" ? true : s.status_skripsi === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <>
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#F8F9FB] outline-none focus:outline-none">
        <div className="max-w-7xl mx-auto">
          
          <header className="mb-10 outline-none focus:outline-none">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Manajemen Akun Mahasiswa</h1>
            <p className="text-slate-500 font-medium mt-3">Pantau status kelulusan mahasiswa dan kelola akun yang telah menyelesaikan masa studinya.</p>
          </header>

          <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden outline-none focus:outline-none">
            
            {/* TOOLBAR BAWAH HEADER CARD */}
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <User size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Direktori Akun</h2>
              </div>

              <div className="flex flex-wrap gap-4">
                
                {/* Filter Dropdown */}
                <div className="relative group">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white text-slate-700 text-sm font-black border border-slate-200 rounded-2xl pl-6 pr-10 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 cursor-pointer appearance-none transition-all min-w-[200px] shadow-sm outline-none"
                  >
                    <option value="Semua Status">Semua Status</option>
                    <option value="Lulus">Telah Lulus</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Belum Mengajukan">Belum Mengajukan</option>
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                </div>

                {/* Search Bar */}
                <div className="relative w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Nama/NPM..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm"
                  />
                </div>
                
              </div>
            </div>

            {/* TABEL DATA */}
            <div className="overflow-x-auto outline-none focus:outline-none">
              <table className="w-full text-left border-collapse outline-none focus:outline-none">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-6 w-[40%]">Mahasiswa</th>
                    <th className="px-8 py-6 text-center w-[30%]">Status Skripsi</th>
                    <th className="px-8 py-6 text-center w-[30%]">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 outline-none focus:outline-none">
                  {isLoading ? (
                    <>
                      {[1, 2, 3, 4, 5].map((item) => (
                        <tr key={item} className="border-b border-slate-50 outline-none focus:outline-none">
                          <td className="px-8 py-8">
                            <div className="flex items-center gap-4 animate-pulse">
                              <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                              <div className="flex flex-col gap-2 flex-1">
                                <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                                <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-8 text-center">
                            <div className="h-6 w-24 bg-slate-200 rounded-xl mx-auto animate-pulse"></div>
                          </td>
                          <td className="px-8 py-8 text-right">
                            <div className="h-9 w-48 bg-slate-200 rounded-xl ml-auto animate-pulse"></div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : error ? (
                    <tr><td colSpan={3} className="px-8 py-24 text-center font-black text-red-400 uppercase tracking-widest">Gagal memuat data</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={3} className="px-8 py-24 text-center font-black text-slate-400 uppercase tracking-widest text-sm">Tidak ada mahasiswa ditemukan</td></tr>
                  ) : (
                    filteredStudents.map((mhs) => {
                      const isLulus = mhs.status_skripsi === 'Lulus';

                      return (
                        <tr key={mhs.id} className="group hover:bg-blue-50/30 transition-all duration-300 outline-none focus:outline-none">
                          
                          {/* KOLOM 1: PROFIL */}
                          <td className="px-8 py-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all relative overflow-hidden shrink-0 border border-slate-200">
                                {mhs.avatar_url ? (
                                  <Image src={mhs.avatar_url} alt={mhs.nama} layout="fill" objectFit="cover" />
                                ) : (
                                  mhs.nama.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 leading-none truncate tracking-tighter">{mhs.nama}</p>
                                <p className="text-[10px] text-slate-400 font-black tracking-widest mt-1.5">{mhs.npm || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* KOLOM 2: STATUS SKRIPSI */}
                          <td className="px-8 py-8 text-center">
                            <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                              isLulus ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              mhs.status_skripsi === 'Diterima' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {mhs.status_skripsi}
                            </span>
                          </td>

                          {/* KOLOM 3: AKSI (BERJEJER) */}
                          <td className="px-8 py-8">
                            <div className="flex items-center justify-end gap-3">
                              
                              {/* TOMBOL DETAIL (Selalu Muncul) */}
<Link href={`/tendik/detailmahasiswa?id=${mhs.id}`}>
  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 outline-none focus:outline-none group">
    DETAIL 
    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
  </button>
</Link>

                              {/* TOMBOL HAPUS AKUN / BELUM LULUS */}
                              {isLulus ? (
                                <button 
                                  onClick={() => handleDeleteAccount(mhs.id, mhs.nama)}
                                  disabled={deletingId === mhs.id}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 outline-none focus:outline-none"
                                >
                                  {deletingId === mhs.id ? <Clock size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  {deletingId === mhs.id ? 'Memproses...' : 'Hapus'}
                                </button>
                              ) : (
                                <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed outline-none focus:outline-none">
                                  <AlertCircle size={14} /> Belum Lulus
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50/30 px-10 py-6 flex items-center justify-between border-t border-slate-100 outline-none focus:outline-none">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total Akun: {filteredStudents.length} Mahasiswa
              </p>
            </div>

          </div>

        </div>
      </main>
    </>
  );
}