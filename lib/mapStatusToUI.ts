export type StatusUI = {
  label: string;
  color: string;
  step: number;
};

export function mapStatusToUI({
  proposalStatus,
  hasSeminar,
  seminarStatus,
  hasSidang,
  verifiedDocsCount = 0,
  uploadedDocsCount = 0,
  isEligible = false,
}: {
  proposalStatus: string;
  hasSeminar: boolean;
  seminarStatus?: string | null;
  hasSidang?: boolean;
  verifiedDocsCount?: number;
  uploadedDocsCount?: number;
  isEligible?: boolean;
}): StatusUI {
  
  // --- PRIORITAS 1: TAHAP AKHIR (Abaikan Syarat Bimbingan) ---
  if (proposalStatus === "Lulus") {
    return { label: "Lulus / Selesai", color: "bg-emerald-100 text-emerald-700 border-emerald-200", step: 9 };
  }
  
  // Jika Kaprodi sudah menjadwalkan sidang di public.sidang_requests
  if (hasSidang) {
    return { label: "Sidang Skripsi", color: "bg-emerald-100 text-emerald-700 border-emerald-200", step: 8 };
  }

  // Jika Seminar sudah dilaksanakan (Selesai)
  if (seminarStatus === "Selesai") {
    return { label: "Perbaikan Pasca Seminar", color: "bg-orange-100 text-orange-700 border-orange-200", step: 7 };
  }

  // --- PRIORITAS 2: VERIFIKASI TENDIK (Abaikan Syarat Bimbingan) ---
  // Jika Tendik Anton sudah verifikasi 3 berkas, Vera harus tampil di tahap Seminar Hasil
  if (verifiedDocsCount >= 3) {
    return { label: "Seminar Hasil", color: "bg-emerald-100 text-emerald-700 border-emerald-200", step: 6 };
  }

  // --- PRIORITAS 3: PROGRES ADMINISTRATIF ---
  if (proposalStatus === "Menunggu Persetujuan Dosbing") {
    return { label: "Persetujuan Dosbing", color: "bg-amber-100 text-amber-700 border-amber-200", step: 1 };
  }

  if (proposalStatus === "Diterima") {
    // Default jika belum layak seminar (Gatekeeping tetap berlaku untuk tahap awal)
    let result = { label: "Proses Bimbingan", color: "bg-indigo-100 text-indigo-700 border-indigo-200", step: 2 };

    if (isEligible) {
      result = { label: "Kesiapan Seminar", color: "bg-blue-100 text-blue-700 border-blue-200", step: 3 };

      if (uploadedDocsCount > 0) {
        result = { label: "Unggah Dokumen Seminar", color: "bg-blue-100 text-blue-700 border-blue-200", step: 4 };
      }

      if (uploadedDocsCount >= 3) {
        result = { label: "Verifikasi Berkas", color: "bg-purple-100 text-purple-700 border-purple-200", step: 5 };
      }
    }
    return result;
  }

  return { label: "Pengajuan Proposal", color: "bg-amber-100 text-amber-700 border-amber-200", step: 0 };
}