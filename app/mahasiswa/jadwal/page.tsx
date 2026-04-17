import { Suspense } from "react";
import JadwalMahasiswaClient from "./jadwalmahasiswaclient"; // Pastikan path ini sesuai dengan nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi secara presisi layout 2 kolom halaman Jadwal Mahasiswa
function SkeletonJadwalMahasiswa() {
  return (
    <div className="p-10 max-w-[1400px] mx-auto font-sans text-slate-700 animate-pulse">
      
      {/* 1. SKELETON HEADER */}
      <div className="mb-10">
        <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
        <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 2. SKELETON CARD KIRI (SEMINAR HASIL) - Col-Span 7 */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0"></div>
                <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
            </div>

            {/* Kotak-kotak Info (Tanggal, Waktu, Ruangan) */}
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex-1 min-w-[200px] h-[100px] flex flex-col justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-5 h-5 bg-slate-200 rounded-md"></div>
                     <div className="h-3 w-20 bg-slate-200 rounded-full"></div>
                   </div>
                   <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* 3. SKELETON CARD KANAN (SIDANG AKHIR) - Col-Span 5 */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[2.5rem] p-10 border border-white shadow-xl shadow-slate-200/50 h-full">
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0"></div>
              <div className="h-6 w-40 bg-slate-200 rounded-lg"></div>
            </div>

            <div className="space-y-6">
              {/* Kotak Info Pelaksanaan */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-5 h-[160px]">
                <div className="h-3 w-32 bg-slate-200 rounded-full mb-2"></div>
                {[1, 2, 3].map((i) => (
                   <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-slate-200 rounded-md"></div>
                      <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                   </div>
                ))}
              </div>
              
              {/* Alert Box Bawah */}
              <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4 gap-3">
                 <div className="w-5 h-5 bg-slate-200 rounded-md"></div>
                 <div className="h-3 w-full bg-slate-200 rounded-full"></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function JadwalMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonJadwalMahasiswa />}>
      <JadwalMahasiswaClient />
    </Suspense>
  );
}