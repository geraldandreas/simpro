import { Suspense } from "react";
import PerbaikanMahasiswaClient from "./perbaikanmahasiswaclient"; // Pastikan path ini merujuk ke file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi secara presisi layout halaman Perbaikan Pasca Seminar
function SkeletonPerbaikanPascaSeminar() {
  return (
    <div className="p-10 max-w-[1400px] mx-auto pb-24 font-sans text-slate-700 animate-pulse">
      
      {/* 1. SKELETON HEADER */}
      <div className="mb-10">
        <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
        <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        
        {/* 2. SKELETON MAIN CARD (STATUS REVISI) */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden">
          
          {/* Card Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0"></div>
              <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-8 w-40 bg-slate-200 rounded-full"></div>
          </div>

          {/* List Dosen Penguji/Pembimbing */}
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Info Dosen */}
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl shrink-0"></div>
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
                    <div className="h-3 w-32 bg-slate-100 rounded-md"></div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-10 w-40 bg-slate-200 rounded-2xl"></div>
                  <div className="h-10 w-32 bg-slate-200 rounded-2xl"></div>
                </div>

              </div>
            ))}
          </div>
          
        </div>
      </div>

    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function PerbaikanMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonPerbaikanPascaSeminar />}>
      <PerbaikanMahasiswaClient />
    </Suspense>
  );
}