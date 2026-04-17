"use client";

// Pastikan kamu memiliki atau sudah membuat komponen sidebar-mahasiswa
import SidebarMahasiswa from "@/components/sidebar";
import NotificationBell from '@/components/notificationBell'; 

export default function MahasiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      {/* SIDEBAR KHUSUS MAHASISWA */}
      <SidebarMahasiswa />
      
      {/* MAIN AREA */}
      <main className="flex-1 ml-64 flex flex-col min-w-0">
        {/* HEADER GLOBAL YANG RAPI */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-end px-10 sticky top-0 z-20 shrink-0 w-full">
          <div className="flex items-center gap-5">
            <NotificationBell />
            <div className="h-6 w-[1px] bg-slate-200" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase mt-0.5">
              SIMPRO
            </span>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}