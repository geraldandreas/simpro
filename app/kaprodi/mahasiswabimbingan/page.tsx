import { Suspense } from "react";
import MahasiswaBimbinganKaprodiClient from "./mahasiswabimbingankaprodiclient"; // Pastikan impor komponen dari client.tsx

export const dynamic = "force-dynamic";

// ================= SKELETON LOADER COMPONENT =================
function SkeletonMahasiswaBimbingan() {
  return (
    <div className="flex-1 flex flex-col font-sans text-slate-700 bg-[#F8F9FB] h-screen animate-pulse">
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        
        {/* Header Title */}
        <div className="mb-10">
          <div className="h-8 w-80 bg-slate-200 rounded-xl mb-3"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Kolom Kiri: Tabel Skeleton (col-span-8) */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
            {/* Header Tabel */}
            <div className="h-20 bg-slate-50 border-b border-slate-100 flex items-center px-8">
              <div className="w-10 h-10 rounded-lg bg-slate-200 mr-4"></div>
              <div className="h-5 w-64 bg-slate-200 rounded-lg"></div>
            </div>
            
            {/* Row Skeleton */}
            <div className="divide-y divide-slate-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center p-8">
                  {/* Avatar & Nama */}
                  <div className="flex items-center gap-4 w-[40%]">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                      <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Status Progress */}
                  <div className="w-[40%] flex justify-center">
                    <div className="h-7 w-32 bg-slate-200 rounded-full"></div>
                  </div>
                  
                  {/* Tombol Detail */}
                  <div className="w-[20%] flex justify-end pr-4">
                    <div className="h-9 w-24 bg-slate-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Scheduler Form Skeleton (col-span-4) */}
          <div className="lg:col-span-4 bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8 min-h-[600px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-slate-200"></div>
              <div className="h-5 w-40 bg-slate-200 rounded-lg"></div>
            </div>

            {/* Kalender Skeleton Box */}
            <div className="bg-slate-50 rounded-2xl h-56 mb-8 border border-slate-100"></div>

            {/* Form Fields Skeleton */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-slate-100 rounded-xl"></div>
                <div className="h-10 bg-slate-100 rounded-xl"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-slate-100 rounded-xl"></div>
                <div className="h-10 bg-slate-100 rounded-xl"></div>
              </div>
              <div className="h-20 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-200 rounded-2xl mt-4"></div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function MahasiswaBimbinganKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonMahasiswaBimbingan />}>
      <MahasiswaBimbinganKaprodiClient />
    </Suspense>
  );
}