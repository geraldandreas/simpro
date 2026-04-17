import { Suspense } from "react";
import DashboardDosenClient from "./dashboarddosenclient"; // Pastikan path ini sesuai dengan file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
function SkeletonDashboardDosen() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            
            {/* 1. SKELETON GREETING */}
            <div className="mb-10">
              <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-10 w-96 bg-slate-200 rounded-xl mb-4"></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
            </div>

            {/* 2. SKELETON STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-[2rem] p-8 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-8">
                  <div className="h-20 w-20 rounded-[1.5rem] bg-slate-200"></div>
                  <div>
                    <div className="h-12 w-16 bg-slate-200 rounded-xl mb-3"></div>
                    <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. SKELETON TABLE SECTION */}
            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
              
              {/* Header Tabel */}
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                <div className="h-6 w-64 bg-slate-200 rounded-lg"></div>
              </div>

              {/* Isi Tabel */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                      <th className="w-[25%]"></th>
                      <th className="w-[15%]"></th>
                      <th className="w-[25%]"></th>
                      <th className="w-[20%]"></th>
                      <th className="w-[15%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {/* Kolom Mahasiswa */}
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0"></div>
                            <div className="h-4 w-40 bg-slate-200 rounded-lg"></div>
                          </div>
                        </td>
                        
                        {/* Kolom NPM */}
                        <td className="px-8 py-8 text-center">
                          <div className="h-4 w-24 bg-slate-200 rounded-lg mx-auto"></div>
                        </td>

                        {/* Kolom Status */}
                        <td className="px-8 py-8 text-center">
                          <div className="h-8 w-32 bg-slate-200 rounded-full mx-auto"></div>
                        </td>

                        {/* Kolom Co-Pembimbing */}
                        <td className="px-8 py-8">
                          <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
                        </td>

                        {/* Kolom Tindakan */}
                        <td className="px-8 py-8 text-center">
                          <div className="h-10 w-28 bg-slate-200 rounded-2xl mx-auto"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Footer Tabel */}
              <div className="h-16 bg-slate-50/50 border-t border-slate-100"></div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function DashboardDosenPage() {
  return (
    <Suspense fallback={<SkeletonDashboardDosen />}>
      <DashboardDosenClient />
    </Suspense>
  );
}