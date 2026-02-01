'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const finishLogin = async () => {
      try {
        /**
         * 1️⃣ Ambil user (PALING AMAN UNTUK CALLBACK)
         */
        const { data: userData, error: userError } =
          await supabase.auth.getUser()

        const user = userData?.user

        if (userError || !user) {
          console.error('Auth error:', userError)
          router.replace('/login')
          return
        }

        /**
         * 2️⃣ Cek profile
         */
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
        }

        let finalProfile = profile

        /**
         * 3️⃣ Kalau profile belum ada → buat otomatis
         */
        if (!finalProfile) {
          const roleFromMeta =
            user.user_metadata?.role ?? 'mahasiswa'

          const namaDefault =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Mahasiswa'

          const { data: newProfile, error: insertError } =
            await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                nama: namaDefault,
                role: roleFromMeta,
                created_at: new Date().toISOString(),
              })
              .select()
              .single()

          if (insertError) {
            console.error('Gagal insert profile:', insertError)
            router.replace('/login')
            return
          }

          finalProfile = newProfile
        }

        /**
         * 4️⃣ Redirect sesuai role
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
            console.warn('Role tidak dikenali:', finalProfile.role)
            router.replace('/login')
        }
      } catch (err) {
        console.error('Auth callback fatal error:', err)
        router.replace('/login')
      }
    }

    finishLogin()
  }, [router])

  return (
    <p className="p-8 text-gray-500">
      Memproses login...
    </p>
  )
}
