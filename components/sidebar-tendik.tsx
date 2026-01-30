"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  FileUp,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

export default function SidebarTendik() {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState("User");
  const [inisial, setInisial] = useState("U");

  // ================= LOAD PROFILE =================
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", user.id)
        .single();

      if (data?.nama) {
        setNama(data.nama);
        setInisial(data.nama.charAt(0).toUpperCase());
      }
    };

    loadProfile();
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
      router.refresh();
    }
  };

  const MENU_ITEMS = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      href: "/tendik/dashboardtendik",
    },
    {
      label: "Manajemen Skripsi",
      icon: <FileUp size={18} />,
      href: "/tendik/manajemenskripsi",
    },
    {
      label: "Verifikasi Berkas",
      icon: <FileText size={18} />,
      href: "/tendik/verifikasiberkas",
    },
  ];

  const OTHER_ITEMS = [
    { label: "Settings", icon: <Settings size={18} />, href: "/settings" },
    { label: "Help", icon: <HelpCircle size={18} />, href: "/help" },
  ];

  const isItemActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30">
      {/* HEADER / PROFILE */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-50">
        <div className="w-10 h-10 bg-[#2b5a9e] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
          {inisial}
        </div>
        <div>
          <p className="text-sm font-bold text-[#1e3a8a] leading-none">
            {nama}
          </p>
          <p className="text-[10px] text-blue-400 mt-1 uppercase font-semibold tracking-wide">
            Tenaga Kependidikan
          </p>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Menu
        </p>

        {MENU_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={isItemActive(item.href)}
          />
        ))}

        <div className="pt-8">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
            Others
          </p>

          {OTHER_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-gray-400 text-sm group hover:text-red-500 transition"
        >
          <LogOut
            size={18}
            className="rotate-180 group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-medium text-xs">Log out</span>
        </button>
        <p className="text-xs text-gray-300 font-medium pl-8 mt-2">
          V.1.0.0
        </p>
      </div>
    </aside>
  );
}

// ================= SUB COMPONENT =================
function NavItem({
  icon,
  label,
  href,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}) {
  return (
    <Link href={href} className="block mb-1">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
          isActive
            ? "bg-blue-50 text-blue-700 shadow-sm"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}
