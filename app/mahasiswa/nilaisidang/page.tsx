import { Suspense } from "react";
import NilaiSidangMahasiswaClient from "./nilaisidangclient"; // Pastikan nama file ini sesuai dengan client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi secara presisi layout halaman Rekapitulasi Penilaian Mahasiswa
function SkeletonNilaiSidangMahasiswa() {
  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans text-slate-700 overflow-hidden animate-pulse">
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB]">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1200px] mx-auto w-full">
            
            {/* 1. SKELETON HEADER */}
            <div className="mb-10">
              <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
            </div>

            {/* 2. SKELETON CONTENT AREA */}
            <div className="space-y-10 w-full">
              
              {/* Skeleton Box Biru Atas (Rekap Seminar) */}
              <div className="bg-slate-200 rounded-[2.5rem] shadow-sm h-48 w-full flex flex-col md:flex-row justify-between items-center p-10 relative overflow-hidden">
                <div className="space-y-4 w-full md:w-1/2">
                  <div className="h-3 w-40 bg-slate-300 rounded-full mb-1"></div>
                  <div className="h-8 w-80 bg-slate-300 rounded-lg"></div>
                  <div className="h-4 w-full max-w-md bg-slate-300 rounded-md mt-2"></div>
                </div>
                
                <div className="flex items-center gap-6 bg-slate-300 p-6 rounded-3xl w-64 h-24 mt-6 md:mt-0"></div>
              </div>

              {/* Skeleton Grid Bawah (Sidang & Cetak BA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Skeleton Box Hijau (Lulus Sidang Akhir) */}
                <div className="h-64 bg-slate-200 rounded-[2.5rem] w-full flex flex-col justify-center p-10 gap-6">
                  <div className="h-3 w-32 bg-slate-300 rounded-full"></div>
                  <div className="h-10 w-3/4 bg-slate-300 rounded-lg"></div>
                  <div className="flex items-center gap-6 mt-auto">
                     <div className="h-16 w-24 bg-slate-300 rounded-2xl"></div>
                     <div className="h-12 w-32 bg-slate-300 rounded-xl"></div>
                  </div>
                </div>

                {/* Skeleton Box Putih (Cetak PDF) */}
                <div className="h-64 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm w-full flex flex-col items-center justify-center text-center p-10">
                  <div className="h-20 w-20 bg-slate-200 rounded-full mb-6"></div>
                  <div className="h-6 w-48 bg-slate-200 rounded-lg mb-4"></div>
                  <div className="h-3 w-64 bg-slate-100 rounded-full mb-8"></div>
                  <div className="h-14 w-48 bg-slate-200 rounded-2xl"></div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function NilaiSidangMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonNilaiSidangMahasiswa />}>
      <NilaiSidangMahasiswaClient />
    </Suspense>
  );
}