"use client";

import Link from "next/link";
import Image from "next/image"; // 🔥 Import Image dari Next.js
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
  PieChart,
  Megaphone,
  CalendarCheck,
  Scale, // 🔥 Tambahan Icon Scale untuk Monitoring Penguji
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SidebarKaprodi() {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // 🔥 State baru untuk avatar

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/kaprodi/dashboardkaprodi" },
    { icon: Users, label: "Mahasiswa Bimbingan", href: "/kaprodi/dashboardkaprodi/mahasiswabimbingan" },
    { icon: FolderOpen, label: "Akses Proposal", href: "/kaprodi/dashboardkaprodi/aksesproposal" },
    { icon: PieChart, label: "Monitoring Bursa", href: "/kaprodi/dashboardkaprodi/manajemenbursa" },
    { icon: Scale, label: "Monitoring Penguji", href: "/kaprodi/dashboardkaprodi/monitoringpenguji" }, // 🔥 Menu Tambahan Baru
    { icon: BarChart2, label: "Progres Semua Mahasiswa", href: "/kaprodi/dashboardkaprodi/progressemuamahasiswa" },
    { icon: FileCheck, label: "Pengajuan Seminar", href: "/kaprodi/dashboardkaprodi/pengajuanseminar" },
    { icon: FileText, label: "Pengajuan Sidang", href: "/kaprodi/dashboardkaprodi/pengajuansidang" },
    { icon: Megaphone, label: "Pengumuman", href: "/kaprodi/dashboardkaprodi/pengumuman" },
    { icon: CalendarCheck, label: "Jadwal Penguji Seminar", href: "/kaprodi/dashboardkaprodi/jadwalpengujiseminar" },
    { icon: FileCheck, label: "Perbaikan Seminar", href: "/kaprodi/dashboardkaprodi/perbaikanseminar" }, 
  ];

  // ================= FETCH PROFILE =================
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nama, avatar_url") // 🔥 Tambahkan avatar_url di select query
        .eq("id", user.id)
        .single();

      if (data) {
        if (data.nama) setNama(data.nama);
        if (data.avatar_url) setAvatarUrl(data.avatar_url); // 🔥 Set state avatar
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
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#2B5F9E] flex items-center justify-center text-white font-bold text-lg relative overflow-hidden shrink-0 shadow-inner">
            {avatarUrl ? (
              <Image 
                src={avatarUrl} 
                alt="Profile" 
                layout="fill" 
                objectFit="cover" 
              />
            ) : (
              nama ? nama.charAt(0).toUpperCase() : "K"
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {nama || "Kaprodi"}
            </h3>
            <p className="text-xs text-blue-600 font-medium capitalize">
              Kaprodi
            </p>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
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

          <Link href="/kaprodi/dashboardkaprodi/help">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive("/kaprodi/dashboardkaprodi/help")}`}>
              <HelpCircle size={18} />
              <span>Help</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="p-6 border-t border-gray-100 flex items-center gap-3 text-gray-400 bg-white">
        <button 
          onClick={handleLogout}
          className="hover:bg-red-50 p-2 rounded-lg transition-colors group"
        >
          <LogOut size={20} className="rotate-180 group-hover:text-red-500 transition-colors" />
        </button>
        <span className="font-medium text-xs">V.1.0.0</span>
      </div>
    </aside>
  );
}