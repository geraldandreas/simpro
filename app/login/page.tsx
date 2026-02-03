"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      console.error(error);
      return;
    }

    switch (profile.role) {
      case 'mahasiswa':
        router.push('/mahasiswa/dashboard');
        break;
      case 'dosen':
        router.push('/dosen/dashboarddosen');
        break;
      case 'kaprodi':
        router.push('/kaprodi/dashboardkaprodi');
        break;
      case 'tendik':
        router.push('/tendik/dashboardtendik');
        break;
      default:
        alert('Role tidak dikenali.');
        break;
    }
  };

  // ==============================
  // 🔐 Login Email & Password
  // ==============================
  const handleLogin = async () => {
    if (!email || !password) {
      alert('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      alert('User tidak ditemukan.');
      setLoading(false);
      return;
    }

    await redirectByRole(user.id);
    setLoading(false);
  };

  // ==============================
  // 🔵 Login Google OAuth
  // ==============================
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans">
      
      {/* SISI KIRI (BIRU) */}
      <div className="relative bg-[#0d64a8] text-white flex flex-col justify-between overflow-hidden">
        
        <div 
          className="hidden lg:block absolute top-0 -right-1 h-full w-[15%] bg-white"
          style={{ 
            borderRadius: "100% 0 0 100% / 50%",
            transform: "scaleY(1.05)"
          }}
        />

        <div className="z-10 px-12 pt-24 text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Selamat Datang Di <br /> SIMPRO
          </h1>

          <p className="max-w-md text-[14px] leading-relaxed opacity-90 mx-auto lg:mx-0">
            SIMPRO ( Sistem Informasi PROcessing Sidang ) adalah website sistem
            informasi manajemen sidang skripsi yang dapat membantu mahasiswa,
            ketua program prodi serta dosen untuk melakukan monitoring terhadap skripsi.
          </p>
        </div>

        <div className="relative z-10 flex justify-center mt-auto">
          <img
            src="/students.png" 
            alt="Students"
            className="w-[85%] max-w-[480px] object-contain align-bottom"
          />
        </div>
      </div>

      {/* SISI KANAN (FORM MASUK) */}
      <div className="flex items-center justify-center px-8 py-16 lg:px-20">
        <div className="w-full max-w-lg">
          
          <h2 className="text-3xl font-medium text-gray-800 mb-8">Masuk</h2>

          {/* GOOGLE LOGIN */}
          <button
            onClick={handleGoogleLogin}
            className="w-full border border-gray-400 py-3 rounded-full flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-sm"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              className="w-5" 
              alt="Google" 
            />
            <span className="text-gray-700 font-normal">Masuk Dengan Google</span>
          </button>


          {/* REGISTER LINK */}
          <p className="mt-8 text-sm font-normal text-gray-700">
            Belum punya akun?{" "}
            <a href="/signup" className="font-semibold hover:underline">
              Daftar
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
