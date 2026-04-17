import { Suspense } from "react";
import VerifikasiKelulusanKaprodiClient from "./verifikasilulusclient"; // Pastikan path ini sesuai dengan nama file client Anda (misal: "./verifikasikelulusankaprodiclient")

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Desain kerangka (skeleton) yang mereplika UI tabel Verifikasi Kelulusan
function SkeletonVerifikasiKelulusan() {
  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#F8F9FB] min-h-screen animate-pulse">
      <div className="max-w-[1400px] mx-auto w-full">
        
        {/* 1. SKELETON HEADER & SEARCH */}
        <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-10 items-end">
          <div>
            <div className="h-8 w-72 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-12 w-full bg-slate-200 rounded-2xl"></div>
        </div>

        {/* 2. SKELETON TABLE */}
        <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
          {/* Table Header (Abu-abu) */}
          <div className="h-16 bg-slate-50/50 border-b border-slate-100"></div>
          
          {/* Table Rows (Di-loop 5 kali sesuai bentuk aslinya) */}
          <div className="divide-y divide-slate-50 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center py-8 px-10">
                
                {/* Kolom Mahasiswa (35%) */}
                <div className="w-[35%] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                  <div className="space-y-3 w-full">
                    <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                    <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                  </div>
                </div>

                {/* Kolom Judul Skripsi (35%) */}
                <div className="w-[35%] flex flex-col items-center gap-2">
                  <div className="h-2.5 w-full max-w-[280px] bg-slate-200 rounded-full"></div>
                  <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-100 rounded-full"></div>
                </div>

                {/* Kolom Status (15%) */}
                <div className="w-[15%] flex justify-center">
                  <div className="h-7 w-28 bg-slate-200 rounded-xl"></div>
                </div>

                {/* Kolom Aksi (15%) */}
                <div className="w-[15%] flex justify-center">
                  <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
                </div>

              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="h-16 bg-slate-50/30 border-t border-slate-50 mt-auto"></div>
        </div>

      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function VerifikasiKelulusanKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonVerifikasiKelulusan />}>
      <VerifikasiKelulusanKaprodiClient />
    </Suspense>
  );
}