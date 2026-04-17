"use client";

import React from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  CreditCard 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// --- TIPE DATA ---
interface StudentDetail {
  nama: string;
  npm: string;
  avatar_url: string | null;
  phone: string | null;
  alamat: string | null; 
}

// ================= FETCHER SWR =================
const fetchStudentDetailData = async (studentId: string | null) => {
  if (!studentId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("nama, npm, avatar_url, phone, alamat") 
    .eq("id", studentId)
    .single();

  if (error) throw error;
  return data as StudentDetail;
};

export default function DetailMahasiswaTendik() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("id"); 

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: student, isLoading } = useSWR(
    studentId ? `student_detail_${studentId}` : null,
    () => fetchStudentDetailData(studentId),
    {
      revalidateOnFocus: true, // Refresh saat tab aktif kembali
      refreshInterval: 60000,  // Auto-refresh setiap 1 menit
      dedupingInterval: 5000   // Hindari request berulang dalam 5 detik
    }
  );
  
  return (
    <div className="flex-1 min-h-[calc(100vh-80px)] bg-[#F8F9FB] p-10 font-sans text-slate-700 outline-none focus:outline-none custom-scrollbar overflow-y-auto">
      <div className="max-w-5xl mx-auto outline-none focus:outline-none">
        
        {/* TOMBOL KEMBALI */}
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95 outline-none focus:outline-none"
        >
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
            Kembali ke Manajemen Akun
          </span>
        </button>

        {isLoading ? (
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 border border-white animate-pulse">
             <div className="flex items-center gap-10">
                <div className="w-32 h-32 bg-slate-200 rounded-full shrink-0"></div>
                <div className="h-10 w-64 bg-slate-200 rounded-full"></div>
             </div>
             <div className="mt-12 space-y-4">
                <div className="h-16 w-full bg-slate-50 rounded-2xl"></div>
                <div className="h-16 w-full bg-slate-50 rounded-2xl"></div>
             </div>
          </div>
        ) : !student ? (
          <div className="bg-white rounded-[3rem] p-20 shadow-2xl shadow-slate-200/50 border border-white text-center flex flex-col items-center">
            <User size={64} className="text-slate-200 mb-6" />
            <h2 className="text-2xl font-black text-slate-800">Data Tidak Ditemukan</h2>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 border border-white outline-none focus:outline-none transition-all">
            
            {/* 🔥 HEADER: FOTO DI SEBELAH NAMA 🔥 */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-slate-50 pb-12">
              <div className="w-32 h-32 bg-blue-50 border-4 border-white shadow-xl rounded-full flex items-center justify-center text-blue-600 relative overflow-hidden shrink-0">
                {student.avatar_url ? (
                  <Image src={student.avatar_url} alt={student.nama} fill className="object-cover" />
                ) : (
                  <span className="text-5xl font-black uppercase">{student.nama.charAt(0)}</span>
                )}
              </div>
              
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                  {student.nama}
                </h1>
              </div>
            </div>

            {/* 🔥 GRID CONTENT: NPM, PHONE, ALAMAT 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box NPM */}
              <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nomor Pokok Mahasiswa</p>
                  <p className="text-lg font-black text-slate-800 tracking-tight">{student.npm || "-"}</p>
                </div>
              </div>

              {/* Box Telepon */}
              <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-500 shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nomor Telepon</p>
                  <p className="text-lg font-black text-slate-800 tracking-tight">{student.phone || "Belum diisi"}</p>
                </div>
              </div>

              {/* Box Alamat (Full Width) */}
              <div className="md:col-span-2 flex items-start gap-5 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-orange-500 shrink-0">
                  <MapPin size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat Lengkap Domisili</p>
                  <p className="text-md font-bold text-slate-700 leading-relaxed">
                    {student.alamat || "Informasi alamat belum dilengkapi oleh mahasiswa yang bersangkutan."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}