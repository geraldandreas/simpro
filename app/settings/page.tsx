"use client";

import React, { useEffect, useState } from "react";
// ShieldLock diganti menjadi ShieldCheck
import { Bell, Search, Trash2, LogOut, Check, User, ShieldCheck, AlertCircle, Phone, Mail, IdCard, Lock } from "lucide-react"; 
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// --- IMPORT SIDEBARS ---
import SidebarDosen from "@/components/sidebar-dosen";
import SidebarTendik from "@/components/sidebar-tendik";
import SidebarKaprodi from "@/components/sidebar-kaprodi";
import SidebarMahasiswa from "@/components/sidebar";

// --- TYPES ---
interface ProfileForm {
  nama: string;
  npm_nip: string;
  email: string;
  phone: string;
  role: string;
}
const NEED_ML_64 = ["mahasiswa", "kaprodi", "tendik", ] as const;




export default function SettingsPage() {
  
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    nama: "",
    npm_nip: "",
    email: "",
    phone: "",
    role: "",
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const isDosenSettings = form.role === "dosen";
  
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setForm({
          nama: data.nama ?? "",
          npm_nip: data.npm || data.nip || "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          role: data.role ?? "mahasiswa",
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, [router]);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const payload: any = { nama: form.nama, phone: form.phone };
      if (form.role === "mahasiswa") payload.npm = form.npm_nip;
      else payload.nip = form.npm_nip;

      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      alert("✅ Profil berhasil diperbarui");
    } catch (err: any) {
      alert("❌ Gagal update profil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) return alert("⚠️ Harap isi kedua kolom kata sandi.");
    if (password !== confirmPassword) return alert("⚠️ Kata sandi tidak cocok.");
    if (password.length < 6) return alert("⚠️ Kata sandi minimal 6 karakter.");

    setSavingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("✅ Kata sandi berhasil diubah!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert("❌ Gagal ubah sandi: " + err.message);
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const renderSidebar = () => {
    switch (form.role) {
      case "dosen": return <SidebarDosen />;
      case "tendik": return <SidebarTendik />;
      case "kaprodi": return <SidebarKaprodi />;
      default: return <SidebarMahasiswa />;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Loading Settings...</div>;

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      {renderSidebar()}

     <main
  className={`
    flex-1 min-h-screen flex flex-col
    ${!isDosenSettings ? "ml-64" : ""}
  `}
>

        
        {/* HEADER - Glassmorphism */}
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group">
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Minimalist SIMPRO Text */}
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
              Simpro
            </span>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Akun</h1>
            <p className="text-slate-500 font-medium mt-1">Kelola informasi profil dan keamanan akun Anda dalam satu tempat.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            <div className="lg:col-span-8 space-y-10">
              
              {/* SECTION: PROFIL PENGGUNA */}
              <section className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                    <User size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Profil Pengguna</h2>
                </div>

                <div className="p-10">
                  <div className="flex items-center gap-8 mb-10">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl text-blue-600 font-black text-3xl shrink-0">
                      {form.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-none uppercase tracking-tight">{form.nama || "User"}</h3>
                      <p className="text-blue-600 font-black tracking-[0.15em] text-[10px] mt-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 w-fit uppercase">
                        {form.role}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputGroup label="Nama Lengkap" icon={<User size={16}/>} value={form.nama} onChange={(v) => updateField("nama", v)} />
                    <InputGroup label={form.role === "mahasiswa" ? "NPM" : "NIP / NIDN"} icon={<IdCard size={16}/>} value={form.npm_nip} onChange={(v) => updateField("npm_nip", v)} />
                    <InputGroup label="Email Institusi" icon={<Mail size={16}/>} value={form.email} disabled onChange={() => {}} />
                    <InputGroup label="Nomor WhatsApp" icon={<Phone size={16}/>} value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="0812xxxx" />
                  </div>

                  <div className="flex justify-end mt-10 pt-8 border-t border-slate-50">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-3 bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-70"
                    >
                      {saving ? "Memproses..." : <><Check size={18} /> Simpan Profil</>}
                    </button>
                  </div>
                </div>
              </section>

              {/* SECTION: GANTI KATA SANDI */}
              <section className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <Lock size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Keamanan</h2>
                </div>

                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <InputGroup label="Kata Sandi Baru" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                    <InputGroup label="Konfirmasi Sandi" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
                  </div>

                  <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                    <AlertCircle className="text-indigo-400 shrink-0" size={20} />
                    <p className="text-[11px] font-medium text-indigo-700 leading-relaxed italic">
                      Gunakan minimal 6 karakter kombinasi angka dan huruf untuk keamanan yang lebih baik.
                    </p>
                  </div>

                  <div className="flex justify-end mt-10">
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPass}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70"
                    >
                      {savingPass ? "Memproses..." : "Ubah Kata Sandi"}
                    </button>
                  </div>
                </div>
              </section>

            </div>

            <div className="lg:col-span-4 space-y-10">
              <section className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-8">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Akses Akun</h2>
                <div className="space-y-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-5 text-slate-600 font-bold hover:bg-red-50 hover:text-red-600 rounded-2xl border border-transparent hover:border-red-100 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 group-hover:bg-red-100 rounded-lg transition-colors"><LogOut size={18} /></div>
                      <span className="text-xs uppercase tracking-widest font-black">Keluar</span>
                    </div>
                  </button>

                  <button className="w-full flex items-center justify-between p-5 text-slate-400 font-bold hover:bg-red-50 hover:text-red-600 rounded-2xl border border-transparent hover:border-red-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 group-hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={18} /></div>
                      <span className="text-xs uppercase tracking-widest font-black">Hapus Akun</span>
                    </div>
                  </button>
                </div>
              </section>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mb-4 text-blue-400">Pusat Bantuan</p>
                    <h4 className="text-lg font-bold mb-2">Butuh Bantuan?</h4>
                    <p className="text-[11px] opacity-70 leading-relaxed font-medium">Jika Anda mengalami kendala teknis terkait pengaturan akun, silakan hubungi Tenaga Kependidikan Prodi.</p>
                 </div>
                 <User className="absolute -right-6 -bottom-6 text-white opacity-5 w-32 h-32" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ================= SUB COMPONENT =================
function InputGroup({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  icon,
  type = "text",
}: {
  label: string;
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {icon && <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-blue-500'}`}>{icon}</div>}
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-11' : 'px-5'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold transition-all outline-none shadow-inner
            ${disabled
              ? "bg-white text-slate-300 cursor-not-allowed border-slate-100"
              : "hover:border-slate-300 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50"}`}
        />
      </div>
    </div>
  );
}