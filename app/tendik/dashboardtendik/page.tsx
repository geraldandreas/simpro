"use client";

import React, { useState, useEffect } from 'react';
import SidebarTendik from '@/components/sidebar-tendik';
import { supabase } from "@/lib/supabaseClient";
import { 
  FileUp, 
  FileText, 
  Bell, 
  Search, 
  MoreHorizontal, 
  Filter,
  Mail, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  ChevronRight
} from 'lucide-react';

// --- TYPES (Tetap Sama) ---
interface StatCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  trend: string;
  trendColor: string;
}

interface StudentTask {
  name: string;
  npm: string;
  title: string;
  status: string;
  lecturer: string;
}

interface VerificationItem {
  id: string;
  nama_dokumen: string;
  file_url: string;
  created_at: string;
  proposal: {
    user: {
      nama: string;
    } | null;
  } | null;
}

const DOC_LABEL: Record<string, string> = {
  berita_acara_bimbingan: "Berita Acara Bimbingan",
  transkrip_nilai: "Transkrip Nilai",
  matriks_perbaikan: "Matriks Perbaikan",
  toefl: "Sertifikat TOEFL",
  print_jurnal: "Print Jurnal",
  sertifikat_publikasi: "Sertifikat Publikasi",
  test_manual: "Dokumen Manual",
};

export default function DashboardTendik() {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationItem[]>([]);
  const [loadingVerification, setLoadingVerification] = useState(true);

  const fetchVerification = async () => {
    try {
      setLoadingVerification(true);
      const { data, error } = await supabase
        .from("seminar_documents")
        .select(`
          id, nama_dokumen, file_url, created_at,
          proposal:proposal_id ( user:user_id ( nama ) )
        `)
        .eq("status", "Menunggu Verifikasi")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVerificationData((data ?? []) as VerificationItem[]);
    } catch (err) {
      console.error("❌ Gagal fetch verifikasi:", err);
    } finally {
      setLoadingVerification(false);
    }
  };

  useEffect(() => { fetchVerification(); }, []);

  const toggleDropdown = (id: string) => {
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.verification-menu-container') === null) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      <SidebarTendik />

      <main className="flex-1 ml-64 min-h-screen">
        {/* HEADER (Improved Visual) */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Cari mahasiswa atau dokumen..." 
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-transparent border focus:bg-white focus:border-blue-400 rounded-xl text-sm outline-none transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-5">
            <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
              <Mail size={22} />
            </button>
            <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 ml-2">A</div>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Selamat Datang, Anton!</h1>
            <p className="text-slate-500 font-medium mt-1">Ini ringkasan aktivitas administrasi skripsi hari ini.</p>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <StatCard 
              icon={<Users size={24} />}
              count={12} 
              label="Usulan Judul Baru" 
              trend="+5 minggu ini" 
              trendColor="text-emerald-500" 
            />
            <StatCard 
              icon={<FileText size={24} />}
              count={26} 
              label="Perlu Verifikasi" 
              trend="Urgent" 
              trendColor="text-red-500" 
            />
            <StatCard 
              icon={<Calendar size={24} />}
              count={8} 
              label="Jadwal Seminar" 
              trend="Tetap" 
              trendColor="text-slate-400" 
            />
          </div>

          {/* TABLE MANAGEMENT */}
          <section className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-12 overflow-hidden">
            <div className="p-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Skripsi</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Daftar mahasiswa aktif</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black border border-slate-100 hover:bg-slate-100 transition-all shadow-sm">
                  <Filter size={14} />
                  FILTER STATUS
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                    <th className="px-8 py-5">Mahasiswa</th>
                    <th className="px-8 py-5 text-center">NPM</th>
                    <th className="px-8 py-5">Judul Skripsi</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <StudentRow 
                    name="Gerald Christopher"
                    npm="140810220014"
                    title="Rancang Bangun Sistem Informasi Manajemen Bidang Skripsi Menggunakan Metode Extreme Programming"
                    status="Disetujui"
                    lecturer="Dr. Juli Rejito, M.Kom"
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* VERIFICATION LIST */}
          <section className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-visible pb-10">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Antrean Verifikasi</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Berkas masuk bimbingan</p>
              </div>
              <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full">{verificationData.length} TOTAL</span>
            </div>

            <div className="divide-y divide-slate-50">
              {loadingVerification ? (
                <div className="p-20 text-center text-slate-400 font-bold animate-pulse">
                  Menghubungkan ke server...
                </div>
              ) : verificationData.length === 0 ? (
                <div className="p-20 text-center">
                   <CheckCircle className="mx-auto text-slate-100 mb-4" size={60} />
                   <p className="text-slate-400 font-bold">Semua dokumen telah diverifikasi.</p>
                </div>
              ) : (
                verificationData.map((item) => (
                  <VerificationRow 
                    key={item.id}
                    item={item}
                    isActive={activeDropdownId === item.id}
                    onToggle={() => toggleDropdown(item.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function StatCard({ icon, count, label, trend, trendColor }: StatCardProps) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-white shadow-lg shadow-slate-200/50 flex flex-col items-start gap-4 hover:translate-y-[-4px] transition-all duration-300 group">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div>
        <p className="text-4xl font-black text-slate-800 tracking-tighter">{count}</p>
        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-tight">{label}</p>
        <p className={`text-[10px] font-black mt-4 uppercase tracking-widest ${trendColor}`}>
          ● {trend}
        </p>
      </div>
    </div>
  );
}

function StudentRow({ name, npm, title, status, lecturer }: StudentTask) {
  return (
    <tr className="hover:bg-blue-50/30 transition-colors group">
      <td className="px-8 py-6">
        <p className="font-black text-slate-800 text-sm">{name}</p>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{lecturer}</p>
      </td>
      <td className="px-8 py-6 text-center font-bold text-slate-400 text-xs tracking-tighter">{npm}</td>
      <td className="px-8 py-6 max-w-xs">
        <p className="line-clamp-2 text-[13px] font-bold text-slate-600 leading-snug">{title}</p>
      </td>
      <td className="px-8 py-6 text-center">
        <span className="px-4 py-1.5 bg-green-100 text-green-700 text-[10px] uppercase font-black rounded-xl border border-green-200 tracking-widest">
          {status}
        </span>
      </td>
      <td className="px-8 py-6 text-center">
        <button className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest active:scale-95">
          Detail
          <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}

function VerificationRow({ item, isActive, onToggle }: VerificationRowProps) {
  return (
    <div className="px-10 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors verification-menu-container relative group">
      <div className="grid grid-cols-12 w-full items-center gap-4">
        
        <div className="col-span-3">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Mahasiswa</p>
          <p className="font-black text-slate-800 text-sm">{item.proposal?.user?.nama || "-"}</p>
        </div>

        <div className="col-span-5">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Jenis Berkas</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <FileText size={16} />
            </div>
            <p className="font-bold text-slate-700 text-[13px]">
              {DOC_LABEL[item.nama_dokumen] ?? item.nama_dokumen}
            </p>
          </div>
        </div>

        <div className="col-span-3 text-right pr-12">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Masuk Pada</p>
          <p className="font-bold text-slate-500 text-[13px]">
            {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        
        <div className="col-span-1 flex justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm border ${
              isActive 
                ? 'bg-blue-600 text-white border-blue-600 rotate-90' 
                : 'bg-white text-slate-400 border-slate-100 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <MoreHorizontal size={20} />
          </button>

          {isActive && (
            <div className="absolute right-12 top-0 mt-4 w-60 bg-white rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-tighter">
                  <Eye size={18} className="text-slate-400" />
                  Lihat Berkas
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 rounded-xl transition uppercase tracking-tighter border-b border-slate-50">
                  <Download size={18} className="text-slate-400" />
                  Unduh PDF
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition uppercase tracking-tighter">
                  <CheckCircle size={18} />
                  Verifikasi Sekarang
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition uppercase tracking-tighter">
                  <XCircle size={18} />
                  Tolak Berkas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}