"use client";

import React, { useEffect, useState } from "react";
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
  ClipboardList // 🔥 Import icon baru untuk Seminar Bimbingan
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// 🔥 TAMBAHKAN MENU "Seminar Bimbingan" DI BAWAH JADWAL PENGUJI
const MENU_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dosen/dashboarddosen" },
  { label: "Mahasiswa Bimbingan", icon: Users, href: "/dosen/mahasiswabimbingan" },
  { label: "Akses Proposal", icon: FileText, href: "/dosen/aksesproposal" },
  { label: "Jadwal Penguji Seminar", icon: CalendarCheck, href: "/dosen/jadwalpengujiseminar" },
  { label: "Perbaikan Seminar", icon: FileCheck, href: "/dosen/perbaikanseminar" }, 
  { label: "Jadwal Penguji Sidang", icon: GraduationCap, href: "/dosen/jadwalmengujisidang" },
];

const OTHER_ITEMS = [
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function SidebarDosen() {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState("Loading...");
  const [role, setRole] = useState("Dosen");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); 

  // ================= FETCH PROFILE =================
  useEffect(() => {
     const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nama, avatar_url") 
        .eq("id", user.id)
        .single();

      if (data) {
        if (data.nama) setNama(data.nama);
        if (data.avatar_url) setAvatarUrl(data.avatar_url); 
      }
    };

    fetchProfile();

    // Auto update jika ganti profil di settings
    const channel = supabase
      .channel("profile-changes-dosen")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.nama) setNama(updated.nama);
          if (updated?.avatar_url !== undefined) setAvatarUrl(updated.avatar_url);
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

  // ================= ACTIVE MENU =================
  const getItemClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(`${path}/`); 
    return `
      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
      ${
        isActive
          ? "bg-blue-100 text-blue-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }
    `;
  };

  return (
    <aside className="w-64 bg-[#F3F5F9] border-r border-gray-200 h-screen flex flex-col sticky top-0 z-30">
      
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
              nama.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {nama}
            </h3>
            <p className="text-xs text-blue-600 font-medium">
              {role}
            </p>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Menu
          </p>

          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={getItemClass(item.href)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Others
          </p>

          <nav className="space-y-1">
            {OTHER_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={getItemClass(item.href)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ================= LOGOUT ================= */}
      <div className="p-6 mt-auto bg-[#F3F5F9]">
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
              transition-all
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