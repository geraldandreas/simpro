"use client";

import Link from "next/link";
import Image from "next/image"; 
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR, { mutate } from "swr"; // 🔥 IMPORT SWR
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  FileUp,
  MessageSquare,
  FileText,
  Calendar,
  Edit3,
  Settings,
  LogOut,
  FileCheck 
} from "lucide-react";

// ================= FETCHER SWR =================
const fetchProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, role, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    nama: profile?.nama || user.user_metadata?.full_name || user.email || "User",
    role: profile?.role || "Mahasiswa",
    avatar_url: profile?.avatar_url || null,
  };
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // 🔥 IMPLEMENTASI SWR UNTUK CACHING (ANTI KEDIP) 🔥
  const { data } = useSWR('sidebar_user_profile', fetchProfile, {
    revalidateOnFocus: false, // Tidak perlu sering refresh karena data profil jarang berubah
  });

  const displayName = data?.nama || "Loading...";
  const role = data?.role || "Mahasiswa";
  const avatarUrl = data?.avatar_url || null;

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/mahasiswa/dashboard" },
    { icon: FileUp, label: "Unggah Proposal", href: "/mahasiswa/uploadproposal" },
    { icon: MessageSquare, label: "Bimbingan", href: "/mahasiswa/bimbinganmahasiswa" },
    { icon: FileText, label: "Unggah Dokumen Seminar", href: "/mahasiswa/uploaddokumen" },
    { icon: Calendar, label: "Jadwal Seminar & Sidang", href: "/mahasiswa/jadwal" },
    { icon: Edit3, label: "Perbaikan Pasca Seminar", href: "/mahasiswa/perbaikan" },
    { icon: FileCheck, label: "Dokumen Sidang", href: "/mahasiswa/dokumensidang" }, 
  ];

  // ---------------- AUTO REFRESH JIKA PROFIL DIUBAH DI SETTINGS ----------------
  useEffect(() => {
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          // Refresh SWR Cache secara instan jika ada perubahan di database
          mutate('sidebar_user_profile'); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ================= LOGOUT FUNCTION =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-[#F3F5F9] border-r border-gray-200 flex flex-col fixed h-full z-30">
      
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
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-xs text-blue-600 font-medium capitalize">
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
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Others
          </p>

          <nav className="space-y-1">
            <Link href="/settings">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/settings"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <Settings size={20} />
                <span>Settings</span>
              </div>
            </Link>
          </nav>
        </div>
      </div>

      {/* ================= LOGOUT (GAYA DOSEN) ================= */}
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