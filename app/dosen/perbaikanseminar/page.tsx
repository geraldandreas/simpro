import { Suspense } from "react";
import PerbaikanSeminarDosenListClient from "./perbaikanseminardosenclient"; // Pastikan path ini sesuai dengan nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi secara presisi layout tabel Perbaikan Seminar
function SkeletonPerbaikanSeminarDosen() {
  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#F8F9FB] min-h-screen font-sans text-slate-700 custom-scrollbar animate-pulse">
      <div className="max-w-[1400px] mx-auto w-full">
        
        {/* 1. SKELETON HEADER & SEARCH SECTION */}
        <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
          <div>
            <div className="h-8 w-72 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
          </div>
          
          <div className="relative w-full outline-none focus:outline-none">
            <div className="h-12 w-full bg-slate-200 rounded-2xl"></div>
          </div>
        </div>

        {/* 2. SKELETON CONTENT / TABLE SECTION */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                  <th className="w-[30%]"></th>
                  <th className="w-[40%]"></th>
                  <th className="w-[15%]"></th>
                  <th className="w-[15%]"></th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-50">
                {/* Loop Row Skeleton */}
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item}>
                    {/* Kolom Mahasiswa */}
                    <td className="py-8 px-10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                        <div className="space-y-3 flex-1">
                          <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                          <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Kolom Judul Skripsi */}
                    <td className="py-8 px-10 text-left">
                      <div className="flex flex-col gap-2">
                        <div className="h-2.5 w-full max-w-[280px] bg-slate-200 rounded-full"></div>
                        <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-100 rounded-full"></div>
                      </div>
                    </td>
                    
                    {/* Kolom Status */}
                    <td className="py-8 px-10 text-center">
                      <div className="h-7 w-28 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                    
                    {/* Kolom Aksi */}
                    <td className="py-8 px-10 text-center">
                      <div className="h-10 w-32 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Skeleton Footer Tabel */}
          <div className="h-16 bg-slate-50/30 border-t border-slate-50 mt-auto"></div>
        </div>

      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function PerbaikanSeminarDosenPage() {
  return (
    <Suspense fallback={<SkeletonPerbaikanSeminarDosen />}>
      <PerbaikanSeminarDosenListClient />
    </Suspense>
  );
}