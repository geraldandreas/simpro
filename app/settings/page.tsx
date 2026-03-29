"use client";

import React, { useEffect, useState, useRef } from "react";
import useSWR from "swr"; 
import { 
  Bell, Search, Trash2, LogOut, Check, User, 
  ShieldCheck, AlertCircle, Phone, Mail, IdCard, Lock, Camera, PenTool, UploadCloud 
} from "lucide-react"; 
import NotificationBell from '@/components/notificationBell';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// --- IMPORT SIDEBARS ---
import SidebarDosen from "@/components/sidebar-dosen";
import SidebarTendik from "@/components/sidebar-tendik";
import SidebarKaprodi from "@/components/sidebar-kaprodi";
import SidebarMahasiswa from "@/components/sidebar";
import Image from "next/image"; 

// --- TYPES ---
interface ProfileForm {
  nama: string;
  npm_nip: string;
  email: string;
  phone: string;
  role: string;
  avatar_url: string | null; 
  ttd_url: string | null; // 🔥 TAMBAHAN STATE TTD
}

// ================= FETCHER SWR =================
const fetchProfileData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return { user, profile: data };
};

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ttdInputRef = useRef<HTMLInputElement>(null); // 🔥 REF UNTUK INPUT TTD

  const { data, error, isLoading, mutate } = useSWR('settings_user_profile', fetchProfileData, {
    revalidateOnFocus: false, 
  });

  const [form, setForm] = useState<ProfileForm>({
    nama: "",
    npm_nip: "",
    email: "",
    phone: "",
    role: "mahasiswa", 
    avatar_url: null,
    ttd_url: null, // 🔥 INIT TTD
  });

  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingTtd, setUploadingTtd] = useState(false); // 🔥 STATE LOADING TTD

  useEffect(() => {
    if (data?.profile && !initialized) {
      setForm({
        nama: data.profile.nama ?? "",
        npm_nip: data.profile.npm || data.profile.nip || "",
        email: data.profile.email ?? data.user.email ?? "",
        phone: data.profile.phone ?? "",
        role: data.profile.role ?? "mahasiswa",
        avatar_url: data.profile.avatar_url ?? null,
        ttd_url: data.profile.ttd_url ?? null, // 🔥 SINKRONISASI DATA TTD
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const isDosenSettings = form.role === "dosen" || form.role === "kaprodi";

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ================= UPLOAD AVATAR LOGIC =================
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.includes('image/')) return alert("Harap unggah file gambar (JPG/PNG).");
      if (file.size > 2 * 1024 * 1024) return alert("Ukuran gambar maksimal 2MB.");

      const userId = data?.user?.id;
      if (!userId) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      if (updateError) throw updateError;

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      mutate(); 
      alert("✅ Foto profil berhasil diubah!");

    } catch (error: any) {
      alert("❌ Gagal mengunggah foto: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ================= UPLOAD TTD LOGIC 🔥 =================
  const handleTtdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingTtd(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.includes('image/')) return alert("Harap unggah file gambar (JPG/PNG). Disarankan PNG transparan.");
      if (file.size > 2 * 1024 * 1024) return alert("Ukuran gambar maksimal 2MB.");

      const userId = data?.user?.id;
      if (!userId) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `ttd_${userId}_${Date.now()}.${fileExt}`;
      
      // 🔥 Pastikan bucket 'signatures' sudah dibuat di Supabase
      const { error: uploadError } = await supabase.storage.from('signatures').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from('profiles').update({ ttd_url: publicUrl }).eq('id', userId);
      if (updateError) throw updateError;

      setForm((prev) => ({ ...prev, ttd_url: publicUrl }));
      mutate(); 
      alert("✅ Tanda tangan digital berhasil disimpan!");

    } catch (error: any) {
      alert("❌ Gagal mengunggah tanda tangan: " + error.message);
    } finally {
      setUploadingTtd(false);
    }
  };

  // ================= SAVE PROFILE LOGIC =================
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userId = data?.user?.id;
      if (!userId) return;

      const payload: any = { nama: form.nama, phone: form.phone };
      if (form.role === "mahasiswa") payload.npm = form.npm_nip;
      else payload.nip = form.npm_nip;

      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      
      mutate(); 
      alert("✅ Profil berhasil diperbarui");
    } catch (err: any) {
      alert("❌ Gagal update profil: " + err.message);
    } finally {
      setSaving(false);
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

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      {renderSidebar()}

      <main className={`flex-1 min-h-screen flex flex-col overflow-y-auto custom-scrollbar ${form.role !== "dosen" ? "ml-64" : ""}`}>
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6"></div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">Simpro</span>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Akun</h1>
            <p className="text-slate-500 font-medium mt-1">Kelola informasi profil dan keamanan akun Anda dalam satu tempat.</p>
          </header>

          {isLoading && !data ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-slate-200 h-[500px] rounded-[2.5rem]"></div>
              </div>
              <div className="lg:col-span-4 space-y-10">
                <div className="bg-slate-200 h-[200px] rounded-[2.5rem]"></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-10 text-center font-black text-red-500 uppercase tracking-widest bg-white rounded-[2.5rem] shadow-xl">Gagal memuat profil.</div>
          ) : (
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
                      
                      {/* AVATAR UPLOAD SECTION */}
                      <div className="relative group">
                        <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl text-blue-600 font-black text-3xl shrink-0 overflow-hidden relative">
                          {form.avatar_url ? (
                            <Image src={form.avatar_url} alt="Avatar" layout="fill" objectFit="cover" />
                          ) : (
                            form.nama.charAt(0).toUpperCase() || "?"
                          )}
                          
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            <Camera className="text-white" size={24} />
                          </div>
                        </div>
                        
                        <input 
                          type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" 
                          ref={fileInputRef} onChange={handleAvatarUpload}
                        />
                        
                        {uploadingAvatar && (
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg animate-pulse">
                              Uploading...
                          </div>
                        )}
                      </div>

                      <div>
                        {/* HAPUS CLASS 'uppercase' DISINI */}
                        <h3 className="text-2xl font-black text-slate-800 leading-none tracking-tight">{form.nama || "User"}</h3>
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

                    {/* 🔥 SECTION: TANDA TANGAN DIGITAL (KHUSUS DOSEN) 🔥 */}
                    {isDosenSettings && (
                      <div className="mt-10 pt-8 border-t border-slate-50">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                          <PenTool size={16} className="text-blue-500" /> Tanda Tangan Digital
                        </label>
                        
                        <div className="flex items-center gap-6">
                          {/* Preview TTD */}
                          <div className="w-48 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                            {form.ttd_url ? (
                              <Image src={form.ttd_url} alt="Tanda Tangan" layout="fill" objectFit="contain" className="p-2" />
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Belum Ada TTD</span>
                            )}

                            {/* Tombol Upload Overlay */}
                            <div 
                              onClick={() => ttdInputRef.current?.click()}
                              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-2 text-white font-black text-[10px] uppercase tracking-widest"
                            >
                              <UploadCloud size={16} /> Unggah
                            </div>
                          </div>

                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 mb-2">Unggah Foto Tanda Tangan</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              Tanda tangan ini akan digunakan secara otomatis untuk menandatangani dokumen seperti Matriks Perbaikan, Berita Acara, dan Dokumen Pengesahan lainnya. <br/>
                              <b>Saran:</b> Gunakan file PNG dengan *background* transparan.
                            </p>
                            {uploadingTtd && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 animate-pulse">Menyimpan Tanda Tangan...</p>}
                          </div>

                          {/* Hidden Input File untuk TTD */}
                          <input 
                            type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" 
                            ref={ttdInputRef} onChange={handleTtdUpload}
                          />
                        </div>
                      </div>
                    )}

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
          )}

        </div>
      </main>
    </div>
  );
}

// ================= SUB COMPONENT =================
function InputGroup({
  label, value, onChange, disabled, placeholder, icon, type = "text",
}: {
  label: string; value?: string; disabled?: boolean; placeholder?: string; icon?: React.ReactNode; type?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {icon && <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-blue-500'}`}>{icon}</div>}
        <input
          type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-11' : 'px-5'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold transition-all outline-none shadow-inner
            ${disabled ? "bg-white text-slate-300 cursor-not-allowed border-slate-100" : "hover:border-slate-300 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50"}`}
        />
      </div>
    </div>
  );
}