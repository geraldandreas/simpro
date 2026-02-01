'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const router = useRouter()

  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
  // EMAIL SIGNUP
  // ======================
  const handleSignup = async () => {
  if (!nama || !email || !password) {
    alert('Nama, email, dan password wajib diisi.')
    return
  }

  try {
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nama,
          role: 'mahasiswa',
        },
      },
    })

    if (error) {
      alert(error.message)
      return
    }

    // ⚠️ kondisi normal saat email confirmation aktif
    alert(
      'Pendaftaran berhasil.\nSilakan cek email untuk verifikasi.'
    )

    router.push('/login')
  } catch (err) {
    console.error(err)
    alert('Terjadi kesalahan saat signup.')
  } finally {
    setLoading(false)
  }
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
      alert('Gagal login dengan Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans">
      
      {/* SISI KIRI */}
      <div className="relative bg-[#1a5fb4] text-white flex flex-col justify-between">
        <div className="px-12 pt-20">
          <h1 className="text-5xl font-bold mb-6">
            Selamat Datang di <br /> SIMPRO
          </h1>
          <p className="max-w-md opacity-90">
            Sistem Informasi Processing Sidang Skripsi
          </p>
        </div>

        <div className="flex justify-center pb-10">
          <img
            src="/students.png"
            alt="Students"
            className="w-[80%] max-w-[420px]"
          />
        </div>
      </div>

      {/* SISI KANAN */}
      <div className="flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-lg">
          
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">
            Daftar Akun
          </h2>

          {/* GOOGLE */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full border py-3 rounded-full flex justify-center gap-3 hover:bg-gray-50 mb-6 disabled:opacity-50"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="w-5"
            />
            Daftar dengan Google
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-4 text-gray-400 text-sm">atau</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* FORM */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Nama Lengkap</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full border rounded-lg p-3 mt-1"
                placeholder="Nama lengkap"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg p-3 mt-1"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg p-3 mt-1"
              />
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-[#71a1cc] text-white py-4 rounded-xl mt-8 font-semibold disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}
