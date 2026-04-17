import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID tidak ditemukan" }, { status: 400 });
    }

    // Gunakan Service Role Key untuk bypass RLS dan mendapatkan hak akses Admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ========================================================
    // LANGKAH 1: Hapus data dari tabel 'profiles' terlebih dahulu
    // ========================================================
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (dbError) {
      console.error("Gagal menghapus profil:", dbError.message);
      // Teruskan proses walau gagal, karena mungkin profilnya sudah terhapus
    }

    // ========================================================
    // LANGKAH 2: Hapus data dari sistem Authentication
    // ========================================================
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw authError;
    }

    return NextResponse.json({ message: "Akun berhasil dihapus" }, { status: 200 });

  } catch (error: any) {
    console.error("Error API delete-user:", error.message);
    return NextResponse.json({ error: error.message || "Gagal menghapus akun" }, { status: 500 });
  }
}