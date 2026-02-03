"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MENU_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dosen/dashboarddosen" },
  { label: "Mahasiswa Bimbingan", icon: Users, href: "/dosen/mahasiswabimbingan" },
  { label: "Akses Proposal", icon: FileText, href: "/dosen/aksesproposal" },
];

const OTHER_ITEMS = [
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "Help", icon: HelpCircle, href: "/help" },
];

export default function SidebarDosen() {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState("Loading...");
  const [role, setRole] = useState("Dosen");

  // ================= FETCH PROFILE =================
  useEffect(() => {
     const fetchProfile = async () => {
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

    fetchProfile();
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ================= ACTIVE MENU =================
  const getItemClass = (path: string) => {
    const isActive = pathname === path;
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
    <aside className="w-64 bg-[#F3F5F9] border-r border-gray-200 h-screen flex flex-col sticky top-0 overflow-y-auto">
      
      {/* ================= USER PROFILE ================= */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#2B5F9E] flex items-center justify-center text-white font-bold text-lg">
            {nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {nama}
            </h3>
            <p className="text-xs text-blue-600 font-medium">
              {role}
            </p>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <div className="px-4 flex-1">
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
      <div className="p-6 mt-auto">
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
