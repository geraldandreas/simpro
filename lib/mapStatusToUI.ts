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
  
  // --- PRIORITAS 1: TAHAP AKHIR ---
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

  // 🔥 PERBAIKAN: SYARAT MASUK SEMINAR HASIL 🔥
  // Hanya masuk tahap ini JIKA mahasiswa sudah request seminar DAN Kaprodi sudah menyetujui/menjadwalkan
  if (hasSeminar && (seminarStatus === "Disetujui" || seminarStatus === "Dijadwalkan")) {
    return { label: "Seminar Hasil", color: "bg-emerald-100 text-emerald-700 border-emerald-200", step: 6 };
  }

  // --- PRIORITAS 3: PROGRES ADMINISTRATIF AWAL ---
  if (proposalStatus === "Menunggu Persetujuan Dosbing") {
    return { label: "Persetujuan Dosbing", color: "bg-amber-100 text-amber-700 border-amber-200", step: 1 };
  }

  if (proposalStatus === "Diterima") {
    // Default jika belum layak seminar
    let result = { label: "Proses Bimbingan", color: "bg-indigo-100 text-indigo-700 border-indigo-200", step: 2 };

    if (isEligible) {
      // Sama dengan "Kesiapan Seminar" di UI Kaprodi
      result = { label: "Persetujuan Seminar", color: "bg-purple-100 text-purple-700 border-purple-200", step: 3 };

      if (uploadedDocsCount > 0) {
        result = { label: "Unggah Dokumen Seminar", color: "bg-green-100 text-green-700 border-green-200", step: 4 };
      }

      // 🔥 PERBAIKAN: Jika dokumen sudah mulai diverifikasi, tahan statusnya di "Verifikasi Berkas"
      // Jangan diloncat ke "Seminar Hasil" sampai Kaprodi ACC jadwal seminarnya!
      if (verifiedDocsCount > 0 || uploadedDocsCount >= 4) {
        result = { label: "Verifikasi Berkas", color: "bg-teal-100 text-teal-700 border-teal-200", step: 5 };
      }
    }
    return result;
  }

  return { label: "Pengajuan Proposal", color: "bg-amber-100 text-amber-700 border-amber-200", step: 0 };
}