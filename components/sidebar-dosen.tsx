"use client";

import React, { useEffect } from "react";
import useSWR, { mutate } from "swr"; // 🚀 Import SWR
import Image from "next/image"; 
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  CalendarCheck,
  FileCheck,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ================= FETCHER SWR =================
const fetchDosenProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, avatar_url") 
    .eq("id", user.id)
    .single();

  return {
    nama: profile?.nama || "Dosen",
    avatar_url: profile?.avatar_url || null,
  };
};

const MENU_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dosen/dashboarddosen" },
  { label: "Mahasiswa Bimbingan", icon: Users, href: "/dosen/mahasiswabimbingan" },
  { label: "Akses Proposal", icon: FileText, href: "/dosen/aksesproposal" },
  { label: "Jadwal Menguji Seminar", icon: CalendarCheck, href: "/dosen/jadwalpengujiseminar" },
  { label: "Perbaikan Seminar", icon: FileCheck, href: "/dosen/perbaikanseminar" }, 
  { label: "Jadwal Menguji Sidang", icon: GraduationCap, href: "/dosen/jadwalmengujisidang" },
];

export default function SidebarDosen() {
  const pathname = usePathname();
  const router = useRouter();``

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data } = useSWR('sidebar_dosen_profile', fetchDosenProfile, {
    revalidateOnFocus: false,
  });

  const nama = data?.nama || "Loading...";
  const avatarUrl = data?.avatar_url || null;

  // ================= REALTIME LISTENER =================
  useEffect(() => {
    const channel = supabase
      .channel("profile-changes-dosen")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          mutate('sidebar_dosen_profile'); // Auto update saat profil diubah
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    localStorage.removeItem("user_role"); // Bersihkan role cache
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ================= ACTIVE CLASS =================
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
      ? "bg-blue-50 text-blue-700 font-semibold"
      : "text-gray-400 hover:bg-gray-50";

  return (
   <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-30 shrink-0">
      
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
              nama !== "Loading..." ? nama.charAt(0).toUpperCase() : "D"
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {nama}
            </h3>
            <p className="text-xs text-blue-600 font-medium capitalize">
              Dosen
            </p>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
          MENU
        </p>

       {MENU_ITEMS.map((item) => (
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