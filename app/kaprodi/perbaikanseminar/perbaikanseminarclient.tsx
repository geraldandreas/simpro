"use client";

import React, { useState } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

// ================= FETCHER SWR =================
const fetchDaftarRevisi = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("seminar_feedbacks")
    .select(`
      id,
      status_revisi,
      seminar_request_id,
      request:seminar_requests (
        proposal:proposals (
          judul,
          status,
          status_lulus,
          user:profiles ( nama, npm, avatar_url )
        )
      )
    `)
    .eq("dosen_id", user.id);

  const formattedData = (data || [])
    // 🔥 FILTER LULUS: Buang data jika mahasiswanya sudah lulus
    .filter((item: any) => {
      const rawProposal = item.request?.proposal;
      const prop = Array.isArray(rawProposal) ? rawProposal[0] : rawProposal;
      return prop?.status_lulus !== true && prop?.status !== "Lulus";
    })
    .map((item: any) => {
      const rawProposal = item.request?.proposal;
      const prop = Array.isArray(rawProposal) ? rawProposal[0] : rawProposal;

      return {
        request_id: item.seminar_request_id,
        status: item.status_revisi,
        nama: prop?.user?.nama || "Tanpa Nama",
        npm: prop?.user?.npm || "-",
        avatar: prop?.user?.avatar_url || null,
        judul: prop?.judul || "Tanpa Judul"
      };
    });

  return formattedData;
};

export default function PerbaikanSeminarKaprodiList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: listMahasiswa = [], isLoading } = useSWR(
    'perbaikan_seminar_kaprodi_list',
    fetchDaftarRevisi,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  const filteredList = listMahasiswa.filter(
    (mhs) =>
      mhs.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mhs.npm.includes(searchQuery)
  );

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#F8F9FB] min-h-screen font-sans text-slate-700 custom-scrollbar">
      <div className="max-w-[1400px] mx-auto w-full">
        
        {/* TITLE & SEARCH SECTION */}
        <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
              Perbaikan Seminar
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Pantau proses revisi mahasiswa dan berikan persetujuan (ACC).
            </p>
          </div>
          
          <div className="relative w-full outline-none focus:outline-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Cari Mahasiswa..." 
              className="w-full pl-11 pr-4 py-3 bg-white border-none shadow-xl shadow-slate-200/50 rounded-2xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* CONTENT / TABLE SECTION */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
                  {/* 🔥 Set lebar (width) masing-masing kolom agar proporsional 🔥 */}
                  <th className="py-6 px-10 w-[30%] whitespace-nowrap">MAHASISWA</th>
                  <th className="py-6 px-10 w-[40%] text-center">JUDUL SKRIPSI</th>
                  <th className="py-6 px-10 w-[15%] text-center whitespace-nowrap">STATUS</th>
                  <th className="py-6 px-10 w-[15%] text-center whitespace-nowrap">AKSI</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  // 🔥 SKELETON LOADER BARU 🔥
                  <>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <tr key={item} className="animate-pulse">
                        <td className="py-8 px-10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>
                            <div className="space-y-3 flex-1">
                              <div className="h-3 w-32 bg-slate-100 rounded-full"></div>
                              <div className="h-2 w-20 bg-slate-50 rounded-full"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-8 px-10 text-left">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-2.5 w-full max-w-[280px] bg-slate-100 rounded-full"></div>
                            <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-50 rounded-full"></div>
                          </div>
                        </td>
                        <td className="py-8 px-10 text-center">
                          <div className="h-7 w-28 bg-slate-100 rounded-xl mx-auto"></div>
                        </td>
                        <td className="py-8 px-10 text-center">
                          <div className="h-10 w-32 bg-slate-100 rounded-xl mx-auto"></div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <CheckCircle2 size={32} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                          Tidak ada antrean revisi
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((mhs) => {
                    const isAcc = mhs.status === "diterima";
                    const isReview = mhs.status === "diperiksa";

                    return (
                      <tr key={mhs.request_id} className="group hover:bg-slate-50/80 transition-all duration-300 cursor-default">
                        
                        {/* MAHASISWA */}
                        <td className="py-8 px-10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase overflow-hidden relative shrink-0 transition-all group-hover:bg-blue-600 group-hover:text-white shadow-sm">
                              {mhs.avatar ? (
                                <Image 
                                  src={mhs.avatar} 
                                  alt="Ava" 
                                  fill 
                                  className="object-cover" 
                                />
                              ) : (
                                mhs.nama.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 tracking-tight whitespace-nowrap truncate">{mhs.nama}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-widest">{mhs.npm}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* JUDUL */}
                        <td className="py-8 px-10 text-center">
                            <p className="text-[13px] font-bold text-slate-600 leading-relaxed line-clamp-2 max-w-md mx-auto">
                              "{mhs.judul}"
                            </p>
                        </td>

                        {/* STATUS */}
                        <td className="py-8 px-10 text-center">
                          <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${
                            isAcc ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            isReview ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {isAcc ? <CheckCircle2 size={12}/> : isReview ? <Clock size={12}/> : <AlertCircle size={12}/>}
                            {isAcc ? 'Telah Di-ACC' : isReview ? 'Balasan Baru' : 'Perlu Revisi'}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="py-8 px-10 text-center">
                          <button 
                            onClick={() => router.push(`/kaprodi/detailperbaikanseminar?id=${mhs.request_id}`)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg group/btn whitespace-nowrap"
                          >
                             DETAIL
                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!isLoading && (
            <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Terdata: {filteredList.length} Revisi Aktif</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}