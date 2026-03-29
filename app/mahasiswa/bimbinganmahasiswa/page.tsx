import { Suspense } from "react";
import BimbinganMahasiswaClient from "./bimbinganmahasiswaclient";
import Sidebar from "@/components/sidebar"; // 🔥 Import Sidebar ke sini juga

export const dynamic = "force-dynamic";

// 🔥 Fallback: Layar Tunggu yang punya Sidebar + Spinner
const SpinnerWithSidebarLoading = () => (
  <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
    {/* Sidebar tetap nongol saat loading */}
    <Sidebar />
    
    {/* Spinner simpel di tengah layar kanan */}
    <main className="flex-1 ml-64 flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
    </main>
  </div>
);

export default function Page() {
  return (
    // 🔥 Masukkan Fallback ke Suspense
    <Suspense fallback={<SpinnerWithSidebarLoading />}>
       <BimbinganMahasiswaClient />
    </Suspense>
  );
}