"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { Bell, Search, User, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ---------------- TYPES ----------------

interface ProfileForm {
  nama: string;
  npm: string;
  email: string;
  phone: string;
}

// ---------------- PAGE ----------------

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileForm>({
    nama: "",
    npm: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);

  // -------- LOAD PROFILE --------
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("nama, npm, email, phone")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setForm({
          nama: data.nama ?? "",
          npm: data.npm ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  // -------- UPDATE FORM FIELD --------
  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // -------- SAVE PROFILE --------
  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        nama: form.nama,
        npm: form.npm,
        phone: form.phone,
      })
      .eq("id", user.id);

    if (!error) {
      // Optional: sync name to auth metadata
      await supabase.auth.updateUser({
        data: {
          full_name: form.nama,
        },
      });

      alert("Profil berhasil diperbarui ✅");
    } else {
      alert("Gagal menyimpan profil ❌");
    }
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-700">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
              size={18}
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition">
            <Bell size={20} />
          </button>
        </header>

        <div className="p-8 max-w-[1200px]">
          <h1 className="text-xl font-bold text-gray-800 mb-6">
            Pengaturan
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-8">
              {/* PROFILE */}
              <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6">
                  Profil Pengguna
                </h2>

                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                    <User size={40} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 leading-none">
                      {form.nama || "-"}
                    </p>
                    <p className="text-sm font-semibold text-gray-400 mt-1">
                      {form.npm || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <InputGroup
                    label="Nama"
                    value={form.nama}
                    onChange={(v) => updateField("nama", v)}
                  />
                  <InputGroup
                    label="NPM"
                    value={form.npm}
                    onChange={(v) => updateField("npm", v)}
                  />
                  <InputGroup
                    label="Email"
                    value={form.email}
                    disabled
                    onChange={(v) => updateField("email", v)}
                  />
                  <InputGroup
                    label="No. Telepon" 
                    value={form.phone}
                    onChange={(v) => updateField("phone", v)}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-[#4a729b] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#3d5e80] transition active:scale-95"
                  >
                    Simpan Perubahan
                  </button>
                </div>

                {/* CHANGE PASSWORD */}
                <div className="mt-12 pt-8 border-t border-gray-50">
                  <h3 className="text-md font-bold text-gray-800 mb-6">
                    Ganti Kata Sandi
                  </h3>
                  <div className="space-y-4 max-w-lg">
                    <input
                      type="password"
                      placeholder="Kata Sandi Saat Ini"
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="password"
                      placeholder="Kata Sandi Baru"
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="password"
                      placeholder="Konfirmasi Kata Sandi Baru"
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="flex justify-end mt-6">
                    <button className="bg-[#4a729b] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#3d5e80] transition active:scale-95">
                      Ubah Sandi
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT */}
            <div className="space-y-8">
              {/* PREFERENCES */}
              <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6">
                  Preferensi Sistem
                </h2>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-4">
                      Tema
                    </p>
                    <div className="flex gap-6">
                      <RadioGroup label="Terang" name="theme" defaultChecked />
                      <RadioGroup label="Gelap" name="theme" />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-4">
                      Bahasa
                    </p>
                    <div className="flex gap-6">
                      <RadioGroup
                        label="Indonesia"
                        name="lang"
                        defaultChecked
                      />
                      <RadioGroup label="Inggris" name="lang" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ACCOUNT */}
              <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6">
                  Manajemen Akun
                </h2>

                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-2.5 text-gray-800 font-bold hover:bg-red-50 hover:text-red-600 rounded-xl transition group">
                    <div className="bg-red-500 p-2 rounded-lg text-white shadow-sm group-hover:bg-red-600">
                      <LogOut size={16} />
                    </div>
                    <span>Logout</span>
                  </button>

                  <button className="w-full flex items-center gap-3 p-2.5 text-gray-800 font-bold hover:bg-red-50 hover:text-red-600 rounded-xl transition group">
                    <div className="bg-red-500 p-2 rounded-lg text-white shadow-sm group-hover:bg-red-600">
                      <Trash2 size={16} />
                    </div>
                    <span>Hapus Akun</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------- SUB COMPONENTS ----------------

function InputGroup({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-lg p-3 text-sm 
          focus:outline-none focus:ring-1 focus:ring-blue-400 transition 
          ${disabled ? "bg-gray-100 text-gray-400" : "bg-gray-50/30"}`}
      />
    </div>
  );
}

function RadioGroup({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="radio"
        name={name}
        defaultChecked={defaultChecked}
        className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
      />
      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition">
        {label}
      </span>
    </label>
  );
}
