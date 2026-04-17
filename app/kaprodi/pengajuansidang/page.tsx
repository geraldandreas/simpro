import { Suspense } from "react";
import PengajuanSidangKaprodiClient from "./pengajuansidangkaprodiclient"; // Pastikan path ini sesuai nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini secara spesifik mereplikasi UI dari halaman Penjadwalan Sidang
function SkeletonPengajuanSidang() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="p-10 max-w-[1400px] mx-auto w-full">
        
        {/* 1. SKELETON HEADER & TITLE */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="hidden lg:block h-10 w-48 bg-slate-200 rounded-2xl"></div>
        </div>

        {/* 2. SKELETON TABLE CARD */}
        <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
          
          {/* Card Header (Abu-abu terang) */}
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
             <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                  <th className="w-[22%]"></th>
                  <th className="w-[15%]"></th>
                  <th className="w-[35%]"></th>
                  <th className="w-[13%]"></th>
                  <th className="w-[15%]"></th>
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

                    {/* Kolom NPM */}
                    <td className="px-8 py-8 text-center">
                      <div className="h-3 w-24 bg-slate-200 rounded-full mx-auto"></div>
                    </td>

                    {/* Kolom Judul Skripsi (Center Aligned) */}
                    <td className="px-8 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-2.5 w-full max-w-[250px] bg-slate-200 rounded-full"></div>
                        <div className="h-2.5 w-2/3 max-w-[180px] bg-slate-100 rounded-full"></div>
                      </div>
                    </td>

                    {/* Kolom Bidang */}
                    <td className="px-8 py-8 text-center">
                      <div className="h-6 w-20 bg-slate-200 rounded-lg mx-auto"></div>
                    </td>

                    {/* Kolom Aksi */}
                    <td className="px-8 py-8 text-center">
                      <div className="h-10 w-28 bg-slate-200 rounded-xl mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function PengajuanSidangKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonPengajuanSidang />}>
      <PengajuanSidangKaprodiClient />
    </Suspense>
  );
}