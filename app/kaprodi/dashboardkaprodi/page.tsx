import { Suspense } from "react";
import DashboardKaprodiClient from "./dashboardkaprodiclient"; // Pastikan path ini sesuai nama file client.tsx

export const dynamic = "force-dynamic";

// ================= SKELETON LOADER COMPONENT =================
function SkeletonDashboardKaprodi() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] pb-12 font-sans text-slate-700 animate-pulse">
      <main className="p-10 max-w-[1400px] w-full mx-auto">
        {/* Skeleton Greeting */}
        <div className="mb-10">
          <div className="h-8 w-64 bg-slate-200 rounded-xl mb-3"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 justify-items-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-white shadow-lg w-full flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 mb-6"></div>
              <div className="h-10 w-16 bg-slate-200 rounded-xl mb-3"></div>
              <div className="h-4 w-24 bg-slate-200 rounded-lg mb-2"></div>
              <div className="h-2 w-32 bg-slate-100 rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Table */}
        <div className="bg-white rounded-[2.5rem] border border-white shadow-xl overflow-hidden min-h-[500px]">
          <div className="h-16 bg-slate-50 border-b border-slate-100 flex items-center px-8">
             <div className="w-8 h-8 rounded-xl bg-slate-200 mr-4"></div>
             <div className="h-4 w-64 bg-slate-200 rounded-lg"></div>
          </div>
          
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center p-8">
                <div className="w-[30%] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0"></div>
                  <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                </div>
                <div className="w-[15%] flex justify-center"><div className="h-3 w-20 bg-slate-200 rounded-full"></div></div>
                <div className="w-[20%] flex justify-center"><div className="h-7 w-32 bg-slate-200 rounded-full"></div></div>
                <div className="w-[20%] flex items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                  <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
                </div>
                <div className="w-[15%] flex justify-center"><div className="h-10 w-28 bg-slate-200 rounded-2xl"></div></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonDashboardKaprodi />}>
      <DashboardKaprodiClient />
    </Suspense>
  );
}