'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-white font-sans overflow-hidden">
      
      {/* --- SISI KIRI (BIRU) --- */}
      <div className="relative bg-[#0d64a8] text-white p-10 lg:p-24 flex flex-col justify-center overflow-hidden">
        
        {/* Glow Dekorasi di Background - Diperhalus agar tidak kaku */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400 rounded-full blur-[150px] opacity-20" />

        <div className="relative z-10 lg:max-w-md"> 
          <h1 className="text-4xl lg:text-6xl font-black mb-8 leading-[1.1] tracking-tighter uppercase">
            Mulai <br /> Perjalanan <br /> Skripsi Anda.
          </h1>
          <p className="text-sm lg:text-base opacity-70 mb-12 font-medium leading-relaxed tracking-tight">
            Bergabunglah dengan <span className="font-bold text-white uppercase">Simpro</span> untuk kemudahan monitoring, 
            bimbingan terstruktur, dan penjadwalan sidang yang lebih transparan.
          </p>

          {/* Feature Cards - Diberi batasan lebar agar tidak menabrak lengkungan putih */}
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

        {/* Logo SIMPRO - Posisi disesuaikan agar tetap terlihat jelas */}
        <div className="absolute bottom-12 left-10 lg:left-24 z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl">
             <span className="text-[#0d64a8] font-black text-xl">S</span>
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase">Simpro</span>
        </div>

        {/* --- LENGKUNGAN (CURVE) - Posisi diperbaiki agar tidak menutup teks --- */}
        {/* Menggunakan w-[70%] dan -right-[35%] untuk memberikan kelengkungan yang lebih landai dan jauh dari teks */}
        <div 
          className="hidden lg:block absolute top-[-10%] -right-[35%] h-[120%] w-[50%] bg-white shadow-[-50px_0_100px_rgba(0,0,0,0.03)]"
          style={{ 
            borderRadius: "50%", 
            zIndex: 5 
          }}
        />
      </div>

      {/* --- SISI KANAN (FORM) --- */}
      <div className="relative flex flex-col justify-center items-center px-8 py-20 lg:px-24">
        <div className="w-full max-w-sm relative z-10">
          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Daftar Akun</h2>
            <p className="text-slate-500 font-bold text-sm tracking-tight leading-relaxed max-w-[280px] mx-auto lg:mx-0">
              Gunakan akun institusi Anda untuk mengakses fitur lengkap manajemen skripsi.
            </p>
          </div>

          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full group bg-white border-2 border-slate-100 py-4 rounded-2xl flex items-center justify-center gap-4 hover:border-[#0d64a8] hover:bg-blue-50/50 transition-all duration-300 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              className="w-6 transition-transform group-hover:rotate-12" 
              alt="Google" 
            />
            <span className="text-slate-800 font-black text-xs uppercase tracking-widest">
              {loading ? 'Processing...' : 'Daftar Dengan Google'}
            </span>
          </button>

          <div className="mt-12 pt-10 border-t border-slate-100 text-center lg:text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Sudah memiliki akun? 
              <a href="/login" className="text-[#0d64a8] ml-2 hover:underline">Masuk Sekarang</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}