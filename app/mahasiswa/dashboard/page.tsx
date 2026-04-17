import { Suspense } from "react";
import DashboardMahasiswaClient from "./dasboardmahasiswaclient"; // Pastikan path ini sesuai dengan file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi secara presisi layout Dashboard Mahasiswa
function SkeletonDashboardMahasiswa() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            
            {/* 1. SKELETON HEADER */}
            <header className="mb-10">
              <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
            </header>

            {/* 2. SKELETON LINIMASA SKRIPSI */}
            <section className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white mb-10 overflow-hidden relative">
              <div className="flex justify-between items-center mb-10">
                <div className="h-4 w-40 bg-slate-200 rounded-md"></div>
                <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
              </div>
              <div className="relative pt-4 pb-8 flex justify-between">
                 {/* Garis Horizontal */}
                 <div className="absolute top-[38px] left-6 w-[95%] h-1.5 bg-slate-100 rounded-full z-0"></div>
                 {/* Bulatan Linimasa */}
                 {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center w-16 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 border-4 border-white shadow-sm"></div>
                      <div className="mt-3 h-2 w-16 bg-slate-100 rounded-full"></div>
                      <div className="mt-1 h-2 w-10 bg-slate-100 rounded-full"></div>
                    </div>
                 ))}
              </div>
            </section>

            {/* 3. SKELETON GRID BAWAH (3 KOLOM) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Kolom Kiri: Kelengkapan Dokumen */}
              <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col items-center">
                <div className="h-4 w-full bg-slate-200 rounded-md mb-10"></div>
                <div className="w-48 h-48 rounded-full border-[12px] border-slate-100 flex items-center justify-center mb-10 shrink-0">
                   <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="w-full space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-full bg-slate-50 rounded-xl border border-slate-100"></div>
                  ))}
                  <div className="h-12 w-full bg-slate-200 rounded-2xl mt-6"></div>
                </div>
              </div>

              {/* Kolom Tengah: Ringkasan Status */}
              <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                <div className="h-4 w-40 bg-slate-200 rounded-md mb-8"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 w-full bg-slate-50 rounded-2xl border border-slate-100"></div>
                  ))}
                </div>
                <div className="mt-8 h-24 w-full bg-slate-50 rounded-3xl border border-slate-100"></div>
              </div>

              {/* Kolom Kanan: Kontak Pembimbing */}
              <div className="lg:col-span-4 space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-center gap-4">
                     <div className="w-14 h-14 bg-slate-200 rounded-2xl shrink-0"></div>
                     <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                        <div className="h-2 w-24 bg-slate-100 rounded-full"></div>
                        <div className="h-2 w-40 bg-slate-50 rounded-full mt-2"></div>
                     </div>
                  </div>
                ))}
                <div className="h-32 w-full bg-slate-200 rounded-[2rem] mt-2"></div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function DashboardMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonDashboardMahasiswa />}>
      <DashboardMahasiswaClient />
    </Suspense>
  );
}