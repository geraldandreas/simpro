'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const finishLogin = async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      /**
       * 1️⃣ Cek apakah profile sudah ada
       */
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      let finalProfile = profile

      /**
       * 2️⃣ Kalau belum ada → buat profile otomatis
       */
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'mahasiswa', // default role
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertError) {
          console.error('Gagal membuat profile:', insertError)
          alert('Gagal membuat profile user.')
          router.replace('/login')
          return
        }

        finalProfile = newProfile
      }

      /**
       * 3️⃣ Redirect berdasarkan role
       */
      switch (finalProfile.role) {
        case 'mahasiswa':
          router.replace('/mahasiswa/dashboard')
          break
        case 'dosen':
          router.replace('/dosen/dashboarddosen')
          break
        case 'kaprodi':
          router.replace('/kaprodi/dashboardkaprodi')
          break
        case 'tendik':
          router.replace('/tendik/dashboardtendik')
          break
        default:
          alert('Role tidak dikenali')
          router.replace('/login')
      }
    }

    finishLogin()
  }, [router])

  return <p className="p-8">Memproses login...</p>
}
