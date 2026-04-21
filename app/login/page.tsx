"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  
  // State untuk Loading & Mode Testing
  const [loading, setLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  // State untuk input form manual
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ==============================
  // 🔁 Redirect berdasarkan role
  // ==============================
  const redirectByRole = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      alert('Role user tidak ditemukan.');
      setLoading(false);
      return;
    }

    switch (profile.role) {
      case 'mahasiswa': router.push('/mahasiswa/dashboard'); break;
      case 'dosen': router.push('/dosen/dashboarddosen'); break;
      case 'kaprodi': router.push('/kaprodi/dashboardkaprodi'); break;
      case 'tendik': router.push('/tendik/dashboardtendik'); break;
      default: alert('Role tidak dikenali.'); break;
    }
  };

  // ==============================
  // 🔵 Login Google OAuth (Asli)
  // ==============================
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
  };

  // ==============================
  // 🟢 Login Email/Password (Bypass Testing)
  // ==============================
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Login gagal: " + error.message);
      setLoading(false);
    } else if (data.user) {
      // Langsung arahkan berdasarkan role setelah berhasil login
      await redirectByRole(data.user.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-white font-sans overflow-hidden">
      
      {/* --- SISI KIRI (BIRU) --- */}
      <div className="relative bg-[#0d64a8] text-white p-10 lg:p-24 flex flex-col justify-center overflow-hidden">
        
        {/* Glow Dekorasi di Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400 rounded-full blur-[150px] opacity-20" />

        <div className="relative z-10 lg:max-w-md"> 
          <h1 className="text-4xl lg:text-6xl font-black mb-8 leading-[1.1] tracking-tighter uppercase">
            Selamat <br /> Datang <br /> Kembali.
          </h1>
          <p className="text-sm lg:text-base opacity-70 mb-12 font-medium leading-relaxed tracking-tight">
            Masuk ke <span className="font-bold text-white uppercase">Simpro</span> untuk melanjutkan monitoring skripsi, 
            mengecek bimbingan, dan melihat jadwal sidang Anda.
          </p>

          {/* Feature Cards - Konsisten dengan Signup */}
          <div className="flex gap-3 mt-8 max-w-[400px]">
            {[
              { icon: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png", label: "Monitoring" },
              { icon: "https://cdn-icons-png.flaticon.com/512/953/953361.png", label: "Bimbingan" },
              { icon: "https://cdn-icons-png.flaticon.com/512/3652/3652191.png", label: "Penjadwalan" }
            ].map((item, i) => (
              <div key={i} className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-[2rem] flex flex-col items-center gap-3 transition-all hover:bg-white/20">
                <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
                   <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain brightness-0 invert" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logo SIMPRO */}
        <div className="absolute bottom-12 left-10 lg:left-24 z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl">
             <span className="text-[#0d64a8] font-black text-xl">S</span>
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase">Simpro</span>
        </div>

        {/* --- LENGKUNGAN (CURVE) - Bulat Sempurna --- */}
        <div 
          className="hidden lg:block absolute top-[-10%] -right-[35%] h-[120%] w-[50%] bg-white shadow-[-50px_0_100px_rgba(0,0,0,0.03)]"
          style={{ borderRadius: "50%", zIndex: 5 }}
        />
      </div>

      {/* --- SISI KANAN (FORM) --- */}
      <div className="relative flex flex-col justify-center items-center px-8 py-20 lg:px-24">
        <div className="w-full max-w-sm relative z-10">
          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase">
              {isTestMode ? 'Akses Khusus' : 'Masuk Akun'}
            </h2>
            <p className="text-slate-500 font-bold text-sm tracking-tight leading-relaxed max-w-[280px] mx-auto lg:mx-0">
              {isTestMode 
                ? 'Gunakan email dan password dummy yang telah diberikan untuk keperluan testing.' 
                : 'Silakan masuk menggunakan akun Google institusi yang telah terdaftar.'}
            </p>
          </div>

          {/* RENDER KONDISIONAL FORM */}
          {!isTestMode ? (
            <>
              {/* TOMBOL GOOGLE */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full group bg-white border-2 border-slate-100 py-4 rounded-2xl flex items-center justify-center gap-4 hover:border-[#0d64a8] hover:bg-blue-50/50 transition-all duration-300 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  className="w-6 transition-transform group-hover:rotate-12" 
                  alt="Google" 
                />
                <span className="text-slate-800 font-black text-xs uppercase tracking-widest">
                  {loading ? 'Memproses...' : 'Masuk Dengan Google'}
                </span>
              </button>

              {/* TOMBOL RAHASIA UNTUK TESTING DOSEN */}
              <div className="mt-6 text-center lg:text-left">
                <button 
                  onClick={() => setIsTestMode(true)}
                  className="text-[9px] font-black text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-[0.2em]"
                >
                  [ Bypass UAT / Dosen ]
                </button>
              </div>
            </>
          ) : (
            /* FORM EMAIL/PASSWORD TESTING */
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <input 
                type="email" 
                placeholder="Email Dosen (Testing)" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-slate-100 py-3 px-4 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d64a8] transition-colors"
              />
              <input 
                type="password" 
                placeholder="Password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-100 py-3 px-4 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d64a8] transition-colors"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#0d64a8] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#0a4d82] transition-colors active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading ? 'Memproses...' : 'Masuk (Testing)'}
              </button>
              
              <button 
                type="button"
                onClick={() => setIsTestMode(false)}
                className="mt-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-center"
              >
                Kembali ke Login Google
              </button>
            </form>
          )}

          {/* FOOTER DAFTAR AKUN */}
          <div className="mt-12 pt-10 border-t border-slate-100 text-center lg:text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Belum memiliki akun? 
              <a href="/signup" className="text-[#0d64a8] ml-2 hover:underline">Daftar Sekarang</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}