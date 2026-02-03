'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // ======================
  // HELPER ERROR
  // ======================
  const showError = (err: any) => {
    if (!err) return
    if (typeof err === 'string') alert(err)
    else if (err.message) alert(err.message)
    else alert('Terjadi kesalahan')
  }

  // ======================
  // GOOGLE SIGNUP
  // ======================
  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) showError(error)
    } catch (err) {
      console.error(err)
      alert('Gagal daftar dengan Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans">
      
      {/* SISI KIRI (BIRU) - Disamakan dengan Login */}
      <div className="relative bg-[#0d64a8] text-white flex flex-col justify-between overflow-hidden">
        
        {/* Dekorasi Lengkung Putih */}
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

      {/* SISI KANAN (FORM DAFTAR) */}
      <div className="flex items-center justify-center px-8 py-16 lg:px-20">
        <div className="w-full max-w-lg">
          
          <h2 className="text-3xl font-medium text-gray-800 mb-8">Daftar Akun</h2>

          {/* GOOGLE SIGNUP BUTTON - Styling disamakan dengan Login */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full border border-gray-400 py-3 rounded-full flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              className="w-5" 
              alt="Google" 
            />
            <span className="text-gray-700 font-normal">
              {loading ? 'Memproses...' : 'Daftar Dengan Google'}
            </span>
          </button>

          {/* LOGIN LINK */}
          <p className="mt-8 text-sm font-normal text-gray-700">
            Sudah punya akun?{" "}
            <a href="/login" className="font-semibold hover:underline">
              Masuk
            </a>
          </p>

        </div>
      </div>
    </div>
  )
}