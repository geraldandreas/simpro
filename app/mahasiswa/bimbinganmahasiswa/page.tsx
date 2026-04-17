import { Suspense } from "react";
import BimbinganMahasiswaClient from "./bimbinganmahasiswaclient"; // Pastikan path ini sesuai dengan file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi layout halaman Bimbingan Mahasiswa secara spesifik
function SkeletonBimbinganMahasiswa() {
  return (
    <div className="p-10 max-w-[1400px] mx-auto animate-pulse font-sans text-slate-700">
      
      {/* 1. SKELETON HEADER */}
      <header className="mb-10 flex flex-col gap-2">
        <div className="h-8 w-80 bg-slate-200 rounded-lg"></div>
        <div className="h-4 w-96 bg-slate-200 rounded-lg mt-1"></div>
      </header>

      {/* 2. SKELETON TABS */}
      <div className="flex bg-slate-200/50 w-fit p-1.5 rounded-2xl mb-10 shadow-inner">
        <div className="w-40 h-10 bg-white rounded-xl shadow-sm"></div>
        <div className="w-40 h-10 bg-transparent rounded-xl"></div>
      </div>

      {/* 3. SKELETON TABLE CONTAINER */}
      <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Table Header / Toolbar */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0"></div>
          <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                <th className="w-[12%]"></th>
                <th className="w-[28%]"></th>
                <th className="w-[15%]"></th>
                <th className="w-[30%]"></th>
                <th className="w-[15%]"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {/* Loop Row Skeleton (5 kali) */}
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item}>
                  {/* Kolom Sesi */}
                  <td className="px-10 py-8">
                    <div className="h-10 w-16 bg-slate-200 rounded-xl"></div>
                  </td>
                  
                  {/* Kolom Waktu & Keterangan */}
                  <td className="px-10 py-8">
                    <div className="space-y-3">
                      <div className="h-4 w-40 bg-slate-200 rounded-md"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded-md"></div>
                    </div>
                  </td>

                  {/* Kolom Metode */}
                  <td className="px-10 py-8">
                    <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
                  </td>

                  {/* Kolom Pembimbing */}
                  <td className="px-8 py-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                      <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
                    </div>
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

        {/* Skeleton Footer / Pagination */}
        <div className="p-10 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center mt-auto">
          <div className="h-3 w-48 bg-slate-200 rounded-full"></div>
          <div className="flex gap-2">
            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-200"></div>
            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-200"></div>
            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-200"></div>
            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-200"></div>
          </div>
        </div>

      </div>

    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function BimbinganMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonBimbinganMahasiswa />}>
      <BimbinganMahasiswaClient />
    </Suspense>
  );
}