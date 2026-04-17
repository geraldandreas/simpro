import { Suspense } from "react";
import PengumumanKaprodiClient from "./pengumumanclient"; // Pastikan path ini sesuai dengan nama file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi layout 2 kolom: Form Buat Baru (Kiri) & Riwayat (Kanan)
function SkeletonPengumuman() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700 animate-pulse">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            
            {/* 1. SKELETON HEADER */}
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
                <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* 2. SKELETON LEFT PANEL (FORM) */}
              <div className="lg:col-span-5 bg-white rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50">
                {/* Form Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                  <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
                </div>

                <div className="space-y-6">
                  {/* Field Target Audiens */}
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-slate-200 rounded-full ml-1"></div>
                    <div className="h-14 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
                  </div>

                  {/* Field Judul */}
                  <div className="space-y-2">
                    <div className="h-3 w-36 bg-slate-200 rounded-full ml-1"></div>
                    <div className="h-14 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
                  </div>

                  {/* Field Konten */}
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded-full ml-1"></div>
                    <div className="h-40 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
                  </div>

                  {/* Button Submit */}
                  <div className="pt-4">
                    <div className="h-14 w-full bg-slate-200 rounded-2xl"></div>
                  </div>
                </div>
              </div>

              {/* 3. SKELETON RIGHT PANEL (HISTORY) */}
              <div className="lg:col-span-7">
                {/* History Header */}
                <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="w-4 h-4 bg-slate-200 rounded-full shrink-0"></div>
                  <div className="h-3 w-40 bg-slate-200 rounded-full"></div>
                </div>

                <div className="space-y-4">
                  {/* Loop 3 History Cards */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative">
                      
                      {/* Top Badges */}
                      <div className="flex gap-2 items-center mb-4">
                        <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
                        <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
                      </div>

                      {/* Action Buttons (Absolute Top Right) */}
                      <div className="absolute top-6 right-6 flex items-center gap-2">
                        <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
                        <div className="h-6 w-20 bg-slate-200 rounded-lg"></div>
                      </div>

                      {/* Title */}
                      <div className="h-5 w-3/4 bg-slate-200 rounded-full mb-3 pr-[180px]"></div>
                      
                      {/* Content Paragraph */}
                      <div className="space-y-2 mb-4">
                        <div className="h-3 w-full bg-slate-100 rounded-full"></div>
                        <div className="h-3 w-full bg-slate-100 rounded-full"></div>
                        <div className="h-3 w-2/3 bg-slate-100 rounded-full"></div>
                      </div>

                      {/* Timestamp Footer */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-200 rounded-full shrink-0"></div>
                        <div className="h-2 w-48 bg-slate-200 rounded-full"></div>
                      </div>

                    </div>
                  ))}
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
export default function PengumumanKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonPengumuman />}>
      <PengumumanKaprodiClient />
    </Suspense>
  );
}