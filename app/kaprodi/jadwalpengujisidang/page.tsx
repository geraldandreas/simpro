import { Suspense } from "react";
import JadwalPengujiSidangClient from "./jadwalpengujisidangclient"; // Pastikan path import ini sesuai dengan nama file Client Component Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Desain kerangka (skeleton) yang mereplika UI tabel Jadwal Menguji Sidang
function SkeletonJadwalSidang() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FB] animate-pulse">
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto w-full">
          
          {/* 1. SKELETON HEADER & SEARCH */}
          <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
            <div>
              <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
            </div>
            
            <div className="relative w-full md:w-[24rem]">
               <div className="h-12 w-full bg-slate-200 rounded-2xl"></div>
            </div>
          </div>

          {/* 2. SKELETON TABLE SECTION */}
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Skeleton Header Table */}
                  <tr className="bg-slate-50/50 h-16 border-b border-slate-100">
                    <th className="w-[25%]"></th>
                    <th className="w-[35%]"></th>
                    <th className="w-[15%]"></th>
                    <th className="w-[10%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Table Rows (Di-loop 5 kali sesuai bentuk aslinya) */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
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
                      
                      {/* Kolom Judul Skripsi */}
                      <td className="py-8 px-8 text-center">
                        <div className="flex flex-col items-center gap-2 px-6">
                          <div className="h-2.5 w-full max-w-[280px] bg-slate-200 rounded-full"></div>
                          <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-100 rounded-full"></div>
                        </div>
                      </td>

                      {/* Kolom Jadwal & Ruangan */}
                      <td className="py-8 px-8 text-center">
                        <div className="h-6 w-20 bg-slate-200 rounded-lg mx-auto"></div>
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
            
            {/* Table Footer */}
            <div className="h-16 bg-slate-50/30 border-t border-slate-50 mt-auto"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function JadwalPengujiSidangKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonJadwalSidang />}>
      <JadwalPengujiSidangClient />
    </Suspense>
  );
}