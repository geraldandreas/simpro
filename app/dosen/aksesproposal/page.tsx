import { Suspense } from "react";
import AksesProposalDosenClient from "./aksesproposaldosenclient"; // Pastikan path ini sesuai dengan nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi layout spesifik halaman Akses Proposal Dosen
function SkeletonAksesProposalDosen() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            
            {/* 1. SKELETON HEADER */}
            <div className="mb-10">
              <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
            </div>

            {/* 2. SKELETON FILTER SECTION */}
            <div className="bg-white p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                 <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-3 space-y-2">
                  <div className="h-2.5 w-20 bg-slate-200 rounded-full"></div>
                  <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <div className="h-2.5 w-24 bg-slate-200 rounded-full"></div>
                  <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
                </div>
                <div className="md:col-span-4 space-y-2">
                  <div className="h-2.5 w-16 bg-slate-200 rounded-full"></div>
                  <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
                </div>
                <div className="md:col-span-2">
                  <div className="h-12 w-full bg-slate-200 rounded-xl"></div>
                </div>
              </div>
            </div>

            {/* 3. SKELETON TABLE SECTION */}
            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                      <th className="w-[25%]"></th>
                      <th className="w-[35%]"></th>
                      <th className="w-[15%]"></th>
                      <th className="w-[15%]"></th>
                      <th className="w-[10%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <tr key={item}>
                        {/* Kolom Mahasiswa */}
                        <td className="py-8 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                            <div className="space-y-3 flex-1">
                              <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                              <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Kolom Usulan Judul */}
                        <td className="py-8 px-8 text-center">
                          <div className="flex flex-col items-center gap-2 px-6">
                            <div className="h-2.5 w-full max-w-[280px] bg-slate-200 rounded-full"></div>
                            <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-100 rounded-full"></div>
                          </div>
                        </td>

                        {/* Kolom Bidang */}
                        <td className="py-8 px-8 text-center">
                          <div className="h-6 w-20 bg-slate-200 rounded-lg mx-auto"></div>
                        </td>

                        {/* Kolom Status */}
                        <td className="py-8 px-8 text-center">
                          <div className="h-7 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                        </td>

                        {/* Kolom Aksi */}
                        <td className="py-8 px-8 text-center">
                          <div className="h-10 w-28 bg-slate-200 rounded-xl mx-auto"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Skeleton Footer */}
              <div className="h-16 bg-slate-50/30 border-t border-slate-50 mt-auto"></div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function AksesProposalDosenPage() {
  return (
    <Suspense fallback={<SkeletonAksesProposalDosen />}>
      <AksesProposalDosenClient />
    </Suspense>
  );
}