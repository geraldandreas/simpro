import { Suspense } from "react";
import AksesProposalKaprodiClient from "./aksesproposalkaprodiclient";

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Mendesain bentuk kerangka yang mirip dengan UI Akses Proposal
function SkeletonAksesProposal() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FB] animate-pulse">
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto w-full">
          
          {/* 1. SKELETON HEADER */}
          <div className="mb-10">
            <div className="h-8 w-64 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
          </div>

          {/* 2. SKELETON FILTER SECTION */}
          <div className="bg-white p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-10 h-[140px] flex items-end gap-6">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-slate-200 rounded-full"></div>
              <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
              <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
            </div>
            <div className="flex-[1.5] space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded-full"></div>
              <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
            </div>
            <div className="w-32 h-12 bg-slate-200 rounded-xl"></div>
          </div>

          {/* 3. SKELETON TABLE SECTION */}
          <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
            {/* Table Header (Abu-abu terang) */}
            <div className="h-16 bg-slate-50/50 border-b border-slate-100"></div>
            
            {/* Table Rows (Dilooping 5 kali) */}
            <div className="divide-y divide-slate-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center p-8">
                  {/* Kolom Mahasiswa */}
                  <div className="flex items-center gap-4 w-[25%] px-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                    <div className="space-y-3 w-full">
                      <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                      <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Kolom Judul Skripsi */}
                  <div className="w-[35%] flex flex-col items-center gap-2 px-4">
                    <div className="h-2.5 w-full max-w-[280px] bg-slate-200 rounded-full"></div>
                    <div className="h-2.5 w-3/4 max-w-[200px] bg-slate-100 rounded-full"></div>
                  </div>
                  
                  {/* Kolom Bidang */}
                  <div className="w-[15%] flex justify-center px-4">
                    <div className="h-6 w-20 bg-slate-200 rounded-lg"></div>
                  </div>
                  
                  {/* Kolom Status */}
                  <div className="w-[15%] flex justify-center px-4">
                    <div className="h-7 w-28 bg-slate-200 rounded-xl"></div>
                  </div>
                  
                  {/* Kolom Aksi */}
                  <div className="w-[10%] flex justify-center px-4">
                    <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function AksesProposalKaprodiPage() {
  return (
    <Suspense fallback={<SkeletonAksesProposal />}>
      <AksesProposalKaprodiClient />
    </Suspense>
  );
}