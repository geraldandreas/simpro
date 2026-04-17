import { Suspense } from "react";
import MonitoringBursaClient from "./manajemenbursaclient"; // Pastikan path ini sesuai dengan file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
function SkeletonMonitoringBursa() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700 animate-pulse">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* 1. SKELETON HEADER */}
            <div className="mb-8">
              <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-80 bg-slate-200 rounded-lg"></div>
            </div>

            {/* 2. SKELETON ACTION BAR */}
            <div className="p-6 rounded-[2rem] border bg-white border-white shadow-slate-200/50 shadow-lg mb-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
                  <div className="h-6 w-40 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="h-12 w-36 bg-slate-200 rounded-2xl"></div>
                <div className="h-12 w-36 bg-slate-200 rounded-2xl"></div>
                <div className="h-12 w-40 bg-slate-200 rounded-2xl"></div>
              </div>
            </div>

            {/* 3. SKELETON SEARCH BAR */}
            <div className="flex justify-end mb-6">
               <div className="w-full md:w-80 h-14 bg-slate-200 rounded-2xl"></div>
            </div>

            {/* 4. SKELETON TABLE */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 h-16 border-b border-slate-100">
                    <th className="w-[30%]"></th>
                    <th className="w-[20%]"></th>
                    <th className="w-[15%]"></th>
                    <th className="w-[20%]"></th>
                    <th className="w-[15%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-slate-50">
                      {/* Dosen Pengajar */}
                      <td className="px-10 py-7">
                        <div className="h-4 w-48 bg-slate-200 rounded-full"></div>
                      </td>
                      {/* Peminat */}
                      <td className="px-6 py-7 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-6 w-14 bg-slate-200 rounded-lg"></div>
                          <div className="h-6 w-14 bg-slate-100 rounded-lg"></div>
                        </div>
                      </td>
                      {/* Disetujui */}
                      <td className="px-6 py-7 text-center">
                        <div className="h-5 w-12 bg-slate-200 rounded-md mx-auto"></div>
                      </td>
                      {/* Mahasiswa Bimbingan */}
                      <td className="px-6 py-7 text-center">
                        <div className="h-5 w-12 bg-slate-200 rounded-md mx-auto"></div>
                      </td>
                      {/* Aksi */}
                      <td className="px-10 py-7 text-center">
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
export default function MonitoringBursaPage() {
  return (
    <Suspense fallback={<SkeletonMonitoringBursa />}>
      <MonitoringBursaClient />
    </Suspense>
  );
}