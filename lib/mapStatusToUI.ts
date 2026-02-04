// lib/mapStatusToUI.ts

export type StatusUI = {
  label: string;
  color: string;
};

/**
 * Mapping status proposal + kondisi seminar
 * ke label & warna UI (GLOBAL)
 */
export function mapStatusToUI({
  proposalStatus,
  hasSeminar,
}: {
  proposalStatus: string;
  hasSeminar: boolean;
}): StatusUI {


  // 🟡 Pengajuan proposal (SEMUA VARIAN)
  if (
    proposalStatus === "Pengajuan Proposal" ||
    proposalStatus === "Menunggu Persetujuan Dosbing"
  ) {
    return {
      label: "Pengajuan Proposal",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }
  

  // 2️⃣ Sudah diterima, tapi belum seminar
  if (proposalStatus === "Diterima" && !hasSeminar) {
    return {
      label: "Proses Bimbingan",
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
  }

  // 3️⃣ Sudah ada seminar request
  if (proposalStatus === "Diterima" && hasSeminar) {
    return {
      label: "Proses Kesiapan Seminar",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }

  // 4️⃣ Seminar proposal
  if (proposalStatus === "Seminar") {
    return {
      label: "Seminar Proposal",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }

  // 5️⃣ Sidang
  if (proposalStatus === "Sidang") {
    return {
      label: "Sidang Skripsi",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }

  // 6️⃣ Lulus
  if (proposalStatus === "Lulus") {
    return {
      label: "Lulus / Selesai",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }

  // 🧯 Fallback (AMAN)
  return {
    label: "Tidak Diketahui",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  };
}
