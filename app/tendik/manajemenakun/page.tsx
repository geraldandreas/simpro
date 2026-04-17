import { Suspense } from "react";
import ManajemenAkunTendikClient from "./manajemenakuntendikclient"; // Pastikan path ini sesuai dengan nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi layout spesifik halaman Manajemen Akun Mahasiswa
function SkeletonManajemenAkunTendik() {
  return (
    <div className="flex flex-col w-full h-full bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          
          {/* 1. SKELETON HEADER */}
          <div className="mb-10">
            <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-4 w-[600px] bg-slate-200 rounded-lg"></div>
          </div>

          <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
            
            {/* 2. SKELETON TOOLBAR (Filter & Search) */}
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                <div className="h-6 w-40 bg-slate-200 rounded-lg"></div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Dropdown Filter Skeleton */}
                <div className="h-12 w-[200px] bg-slate-200 rounded-2xl"></div>
                {/* Search Bar Skeleton */}
                <div className="h-12 w-72 bg-slate-200 rounded-2xl"></div>
              </div>
            </div>

            {/* 3. SKELETON TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                    <th className="w-[40%]"></th>
                    <th className="w-[30%]"></th>
                    <th className="w-[30%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      {/* Kolom Mahasiswa */}
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                          <div className="space-y-3 flex-1">
                            <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                            <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                          </div>
                        </div>
                      </td>

                      {/* Kolom Status Skripsi */}
                      <td className="px-8 py-8 text-center">
                        <div className="h-7 w-28 bg-slate-200 rounded-xl mx-auto"></div>
                      </td>

                      {/* Kolom Tindakan */}
                      <td className="px-8 py-8">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
                          <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. SKELETON FOOTER */}
            <div className="bg-slate-50/30 px-10 py-6 flex items-center justify-between border-t border-slate-100">
              <div className="h-3 w-48 bg-slate-200 rounded-full"></div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function ManajemenAkunTendikPage() {
  return (
    <Suspense fallback={<SkeletonManajemenAkunTendik />}>
      <ManajemenAkunTendikClient />
    </Suspense>
  );
}