"use client";

import Link from "next/link";
import Image from "next/image"; 
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR, { mutate } from "swr"; // 🔥 Import SWR
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BarChart2,
  FileCheck,
  FileText,
  Settings,
  GraduationCap,
  LogOut,
  PieChart,
  Megaphone,
  CalendarCheck,
  Scale,
  CalendarClock, 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ================= FETCHER SWR =================
const fetchKaprodiProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, avatar_url") 
    .eq("id", user.id)
    .single();

  return {
    nama: profile?.nama || "Kaprodi",
    avatar_url: profile?.avatar_url || null,
  };
};

export default function SidebarKaprodi() {
  const pathname = usePathname();
  const router = useRouter();

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data } = useSWR('sidebar_kaprodi_profile', fetchKaprodiProfile, {
    revalidateOnFocus: false,
  });

  const nama = data?.nama || "Loading...";
  const avatarUrl = data?.avatar_url || null;

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/kaprodi/dashboardkaprodi" },
    { icon: Users, label: "Mahasiswa Bimbingan", href: "/kaprodi/mahasiswabimbingan" },
    { icon: FolderOpen, label: "Akses Proposal", href: "/kaprodi/aksesproposal" },
    { icon: PieChart, label: "Monitoring Bursa", href: "/kaprodi/manajemenbursa" },
    { icon: Scale, label: "Monitoring Penguji", href: "/kaprodi/monitoringpenguji" }, 
    { icon: BarChart2, label: "Progres Semua Mahasiswa", href: "/kaprodi/progressemuamahasiswa" },
    { icon: FileCheck, label: "Pengajuan Seminar", href: "/kaprodi/pengajuanseminar" },
    { icon: FileText, label: "Pengajuan Sidang", href: "/kaprodi/pengajuansidang" },
    { icon: Megaphone, label: "Pengumuman", href: "/kaprodi/pengumuman" },
    { icon: CalendarCheck, label: "Jadwal Menguji Seminar", href: "/kaprodi/jadwalpengujiseminar" },
    { icon: FileCheck, label: "Perbaikan Seminar", href: "/kaprodi/perbaikanseminar" }, 
    { icon: CalendarClock, label: "Jadwal Menguji Sidang", href: "/kaprodi/jadwalpengujisidang" },
    { icon: GraduationCap, label: "Verifikasi Lulus", href: "/kaprodi/verifikasilulus" },
  ];

  // ================= REALTIME LISTENER =================
  useEffect(() => {
    const channel = supabase
      .channel("profile-changes-kaprodi")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          mutate('sidebar_kaprodi_profile'); // Auto update jika ganti avatar/nama di settings
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ================= ACTIVE CLASS =================
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
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
              nama !== "Loading..." ? nama.charAt(0).toUpperCase() : "K"
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {nama}
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
              <item.icon size={18} className="shrink-0" />
              <span className="leading-tight">{item.label}</span>
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
              <Settings size={18} className="shrink-0" />
              <span>Settings</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="p-6 mt-auto bg-white">
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-3 px-4 py-3
            rounded-xl text-gray-500 font-medium
            hover:bg-red-50 hover:text-red-600
            transition-all group
          "
        >
          <div
            className="
              w-9 h-9 flex items-center justify-center
              rounded-lg border border-gray-200
              text-gray-400
              group-hover:border-red-200
              group-hover:text-red-600
              transition-all shrink-0
            "
          >
            <LogOut size={18} className="rotate-180" />
          </div>

          <span className="text-sm">Log out</span>
        </button>

        <p className="text-xs text-gray-400 mt-3 ml-12">V.1.0.0</p>
      </div>
    </aside>
  );
}