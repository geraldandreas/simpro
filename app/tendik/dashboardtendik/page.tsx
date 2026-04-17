import { Suspense } from "react";
import DashboardTendikMainClient from "./manajemenskripsitendikclient"; // Pastikan nama file ini sesuai dengan client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini secara spesifik mereplikasi UI dari Dashboard Tendik Main
function SkeletonDashboardTendik() {
  return (
    <div className="flex flex-col w-full h-full bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* 1. SKELETON HEADER */}
        <div className="mb-10">
          <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-10 w-96 bg-slate-200 rounded-xl mb-4"></div>
          <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
        </div>

        {/* 2. SKELETON TABLE CARD */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Card Header & Filters */}
          <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0"></div>
              <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="h-12 w-[240px] bg-slate-200 rounded-2xl"></div>
              <div className="h-12 w-72 bg-slate-200 rounded-2xl"></div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                  <th className="w-[22%]"></th>
                  <th className="w-[33%]"></th>
                  <th className="w-[18%]"></th>
                  <th className="w-[17%]"></th>
                  <th className="w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item}>
                    {/* Kolom Mahasiswa */}
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                          <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Kolom Judul Skripsi */}
                    <td className="px-8 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 px-6">
                        <div className="h-2.5 w-full max-w-[220px] bg-slate-200 rounded-full"></div>
                        <div className="h-2.5 w-3/4 max-w-[160px] bg-slate-100 rounded-full"></div>
                      </div>
                    </td>
                    
                    {/* Kolom Status Timeline */}
                    <td className="px-8 py-8 text-center">
                      <div className="h-6 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                    
                    {/* Kolom Pembimbing */}
                    <td className="px-8 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-2.5 w-28 bg-slate-200 rounded-full"></div>
                        <div className="h-2.5 w-24 bg-slate-100 rounded-full"></div>
                      </div>
                    </td>
                    
                    {/* Kolom Tindakan */}
                    <td className="px-8 py-8 text-center">
                      <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Skeleton Pagination Area */}
          <div className="bg-slate-50/30 px-10 py-6 flex items-center justify-between border-t border-slate-100 mt-auto">
            <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
              <div className="flex gap-1">
                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function DashboardTendikPage() {
  return (
    <Suspense fallback={<SkeletonDashboardTendik />}>
      <DashboardTendikMainClient />
    </Suspense>
  );
}