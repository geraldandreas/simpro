import { Suspense } from "react";
import UploadProposalMahasiswaClient from "./uploadproposalmahasiswaclient"; // Pastikan path ini merujuk ke file client.tsx Anda

export const dynamic = "force-dynamic";

// ================= SKELETON COMPONENT =================
// Skeleton ini mereplikasi layout 2 kolom: Area Upload (Kiri) dan Form Data & Pembimbing (Kanan)
function SkeletonUploadProposal() {
  return (
    <div className="p-10 max-w-[1400px] mx-auto font-sans animate-pulse text-slate-700">
      
      {/* 1. SKELETON HEADER */}
      <div className="mb-10">
        <div className="h-8 w-80 bg-slate-200 rounded-lg mb-3"></div>
        <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 2. SKELETON LEFT PANEL (UPLOAD AREA) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Upload Box Skeleton */}
          <div className="h-[400px] bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-200 rounded-3xl mb-6"></div>
             <div className="h-5 w-64 bg-slate-200 rounded-lg mb-4"></div>
             <div className="h-3 w-48 bg-slate-100 rounded-full mb-8"></div>
             <div className="h-12 w-40 bg-slate-200 rounded-2xl"></div>
          </div>

        </div>

        {/* 3. SKELETON RIGHT PANEL (FORM DATA) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Detail Dokumen / Warning Info (Opsional, dikosongkan/diisi elemen box) */}
          <div className="bg-white p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50">
            <div className="h-5 w-40 bg-slate-200 rounded-lg mb-6"></div>
            <div className="space-y-5">
              <div>
                <div className="h-3 w-16 bg-slate-200 rounded-full mb-2"></div>
                <div className="h-4 w-48 bg-slate-100 rounded-lg"></div>
              </div>
              <div>
                <div className="h-3 w-20 bg-slate-200 rounded-full mb-2"></div>
                <div className="h-4 w-24 bg-slate-100 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Form Data & Pembimbing Skeleton */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
               <div className="h-5 w-48 bg-slate-200 rounded-lg"></div>
            </div>

            <div className="space-y-6">
              
              {/* Field Judul */}
              <div className="space-y-2">
                <div className="h-3 w-32 bg-slate-200 rounded-full ml-1"></div>
                <div className="h-28 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
              </div>

              {/* Field Bidang */}
              <div className="space-y-2">
                <div className="h-3 w-32 bg-slate-200 rounded-full ml-1"></div>
                <div className="h-14 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
              </div>

              <div className="h-px w-full bg-slate-100 my-4"></div>

              {/* Field Pembimbing 1 */}
              <div className="space-y-2">
                <div className="h-3 w-40 bg-slate-200 rounded-full ml-1"></div>
                <div className="h-14 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
              </div>

              {/* Field Pembimbing 2 */}
              <div className="space-y-2">
                <div className="h-3 w-48 bg-slate-200 rounded-full ml-1"></div>
                <div className="h-14 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <div className="h-14 w-full bg-slate-200 rounded-2xl"></div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ================= PAGE WRAPPER =================
export default function UploadProposalMahasiswaPage() {
  return (
    <Suspense fallback={<SkeletonUploadProposal />}>
      <UploadProposalMahasiswaClient />
    </Suspense>
  );
}