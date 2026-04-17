import { Suspense } from "react";
import MahasiswaBimbinganDosenClient from "./mahasiswabimbingandosenclient"; // Pastikan path ini sesuai nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Desain skeleton ini menyalin UI: Kiri (Table Grid-8) dan Kanan (Schedule Form Grid-4)
function SkeletonMahasiswaBimbingan() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
        
        {/* 1. SKELETON HEADER */}
        <div className="mb-10">
          <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* 2. LEFT PANEL (STUDENT TABLE SKELETON) - Col-Span-8 */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
            
            {/* Header Tabel */}
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
              <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                    <th className="w-[45%]"></th>
                    <th className="w-[35%]"></th>
                    <th className="w-[20%]"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {/* Loop Row Skeleton */}
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item}>
                      {/* Kolom Mahasiswa */}
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                          <div className="flex flex-col gap-2 w-full">
                            <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                            <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                          </div>
                        </div>
                      </td>
                      {/* Kolom Progres Skripsi */}
                      <td className="px-8 py-8 text-center">
                        <div className="h-7 w-28 bg-slate-200 rounded-full mx-auto"></div>
                      </td>
                      {/* Kolom Aksi */}
                      <td className="px-8 py-8 text-center">
                        <div className="h-9 w-24 bg-slate-200 rounded-xl mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. RIGHT PANEL (SCHEDULER SKELETON) - Col-Span-4 */}
          <div className="lg:col-span-4 space-y-8 sticky top-24">
            <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8 min-h-[600px]">
              
              {/* Header Form */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-slate-200"></div>
                <div className="h-5 w-32 bg-slate-200 rounded-lg"></div>
              </div>

              {/* Kalender Skeleton */}
              <div className="bg-slate-50 rounded-2xl h-56 mb-8 border border-slate-100"></div>

              {/* Form Input Skeleton */}
              <div className="space-y-6">
                
                {/* Waktu Bimbingan */}
                <div>
                  <div className="h-3 w-32 bg-slate-200 rounded-full mb-2 ml-1"></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                </div>

                {/* Sesi & Metode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded-full mb-2 ml-1"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded-full mb-2 ml-1"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                </div>

                {/* Keterangan Textarea */}
                <div className="h-20 bg-slate-100 rounded-xl"></div>

                {/* Submit Button */}
                <div className="pt-4">
                  <div className="h-12 bg-slate-200 rounded-2xl w-full"></div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function MahasiswaBimbinganKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonMahasiswaBimbingan />}>
      <MahasiswaBimbinganDosenClient />
    </Suspense>
  );
}