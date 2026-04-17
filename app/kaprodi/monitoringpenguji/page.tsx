import { Suspense } from "react";
import MonitoringPengujiSidangClient from "./monitoringpengujiclient"; // Pastikan path ini sesuai dengan file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
function SkeletonMonitoringPenguji() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700 animate-pulse">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* 1. SKELETON HEADER & CONTROLS */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
              <div>
                <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
                <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
              </div>

              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-full lg:w-64 h-12 bg-slate-200 rounded-2xl"></div>
                <div className="w-32 h-12 bg-slate-200 rounded-2xl shrink-0"></div>
              </div>
            </div>

            {/* 2. SKELETON TABLE */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 h-16 border-b border-slate-100">
                    <th className="w-[40%]"></th>
                    <th className="w-[20%]"></th>
                    <th className="w-[20%]"></th>
                    <th className="w-[20%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Table Rows (Di-loop 5 kali) */}
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-slate-50">
                      {/* Kolom Dosen */}
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                          <div className="flex flex-col gap-2">
                            <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                            <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                          </div>
                        </div>
                      </td>
                      {/* Kolom Beban Menguji */}
                      <td className="px-6 py-6 text-center">
                        <div className="h-10 w-10 bg-slate-200 rounded-xl mx-auto"></div>
                      </td>
                      {/* Kolom Status Distribusi */}
                      <td className="px-6 py-6 text-center">
                        <div className="h-8 w-32 bg-slate-200 rounded-xl mx-auto"></div>
                      </td>
                      {/* Kolom Aksi */}
                      <td className="px-10 py-6 text-center">
                        <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* SKELETON PAGINATION */}
              <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                <div className="h-3 w-48 bg-slate-200 rounded-full"></div>
                <div className="flex gap-2">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                  <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                  <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                  <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function MonitoringPengujiSidangPage() {
  return (
    <Suspense fallback={<SkeletonMonitoringPenguji />}>
      <MonitoringPengujiSidangClient />
    </Suspense>
  );
}