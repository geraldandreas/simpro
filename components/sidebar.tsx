"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const [displayName, setDisplayName] = useState("Loading...");
  const [role, setRole] = useState("Mahasiswa");

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/mahasiswa/dashboard" },
    { icon: FileUp, label: "Unggah Proposal", href: "/mahasiswa/uploadproposal" },
    { icon: MessageSquare, label: "Bimbingan", href: "/mahasiswa/bimbinganmahasiswa" },
    { icon: FileText, label: "Unggah Dokumen Seminar", href: "/mahasiswa/uploaddokumen" },
    { icon: Calendar, label: "Jadwal Seminar & Sidang", href: "/mahasiswa/jadwal" },
    { icon: Edit3, label: "Perbaikan Pasca Seminar", href: "/mahasiswa/perbaikan" },
  ];

  // ---------------- LOAD USER NAME ----------------
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1️⃣ Ambil dari table profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama, role")
        .eq("id", user.id)
        .single();

      if (profile?.nama) {
        setDisplayName(profile.nama);
      } else if (user.user_metadata?.full_name) {
        // 2️⃣ Fallback dari Google
        setDisplayName(user.user_metadata.full_name);
      } else {
        // 3️⃣ Fallback terakhir: email
        setDisplayName(user.email ?? "User");
      }

      if (profile?.role) {
        setRole(profile.role);
      }
    };

    loadUser();

    // 🔄 Auto refresh kalau profile berubah
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.nama) {
            setDisplayName(updated.nama);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30">
      <div className="p-6 flex items-center gap-3 border-b border-gray-50">
        <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900 leading-none">
            {displayName}
          </p>
          <p className="text-xs text-blue-400 mt-1">{role}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
          MENU
        </p>

        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
          </Link>
        ))}

        <div className="pt-8">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
            OTHERS
          </p>
          <Link href="/settings">
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                pathname === "/settings"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* FOOTER */}
      <div className="p-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/login" title="Logout">
            <LogOut
              size={22}
              className="text-gray-300 cursor-pointer hover:text-red-500 transition-colors rotate-180"
            />
          </Link>
          <span className="text-gray-400 text-xs font-medium">V.1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
