"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BarChart2,
  FileCheck,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SidebarKaprodi() {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState<string>(""); // 🔑 sumber nama dinamis

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/kaprodi/dashboardkaprodi" },
    { icon: Users, label: "Mahasiswa Bimbingan", href: "/kaprodi/dashboardkaprodi/mahasiswabimbingan" },
    { icon: FolderOpen, label: "Akses Proposal", href: "/kaprodi/dashboardkaprodi/aksesproposal" },
    { icon: BarChart2, label: "Progres Semua Mahasiswa", href: "/kaprodi/dashboardkaprodi/progressemuamahasiswa" },
    { icon: FileCheck, label: "Pengajuan Seminar", href: "/kaprodi/dashboardkaprodi/pengajuanseminar" },
    { icon: FileText, label: "Pengajuan Sidang", href: "/kaprodi/dashboardkaprodi/pengajuansidang" },
  ];

  // ================= FETCH PROFILE =================
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", user.id)
        .single();

      if (data?.nama) {
        setNama(data.nama);
      }
    };

    loadProfile();
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ================= ACTIVE CLASS =================
  const isActive = (href: string) =>
    pathname === href
      ? "bg-blue-50 text-blue-700 font-semibold"
      : "text-gray-400 hover:bg-gray-50";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30">
      {/* ================= USER PROFILE ================= */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-50">
        <div className="w-10 h-10 bg-[#2b5a9e] rounded-full flex items-center justify-center text-white font-bold text-lg">
          {nama ? nama.charAt(0).toUpperCase() : "K"}
        </div>
        <div>
          <p className="text-sm font-bold text-[#1e3a8a] leading-none">
            {nama || "Kaprodi"}
          </p>
          <p className="text-[10px] text-blue-400 mt-1 uppercase font-semibold">
            Kaprodi
          </p>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
          MENU
        </p>

        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive(item.href)}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
          </Link>
        ))}

        {/* ================= OTHERS ================= */}
        <div className="pt-8">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
            OTHERS
          </p>

          <Link href="/settings">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive("/settings")}`}>
              <Settings size={18} />
              <span>Settings</span>
            </div>
          </Link>

          <Link href="/help">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive("/help")}`}>
              <HelpCircle size={18} />
              <span>Help</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="p-6 border-t border-gray-100 flex items-center gap-3 text-gray-400">
        <button onClick={handleLogout}>
          <LogOut size={20} className="rotate-180 hover:text-red-500 transition-colors" />
        </button>
        <span className="font-medium text-xs">V.1.0.0</span>
      </div>
    </aside>
  );
}
