"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabaseClient';
import { Bell, Search, Check, X, Clock, Layout, AlertCircle } from 'lucide-react';

interface DocumentData {
  id?: string;
  status: string; // 'Belum Lengkap' | 'Menunggu Verifikasi' | 'Lengkap' | 'Ditolak'
  file_url?: string;
}

export default function UnggahDokumenSeminar() {
  const [documents, setDocuments] = useState<{ [key: string]: DocumentData }>({});
  const [loading, setLoading] = useState(true);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalStatus, setProposalStatus] = useState<"missing" | "found" | null>(null);

  // ================= LIST DOKUMEN =================

  const academicDocs = [
    { id: 'berita_acara_bimbingan', label: "Berita Acara Bimbingan", subLabel: "Download di SIAT" },
    { id: 'transkrip_nilai', label: "Transkrip Nilai", subLabel: "Disahkan dosen wali" },
    { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi" },
    { id: 'toefl', label: "Sertifikat TOEFL", subLabel: "Skor min 475" },
    { id: 'print_jurnal', label: "Print Out Jurnal Skripsi" },
    { id: 'sertifikat_publikasi', label: "Sertifikat Publikasi / Jurnal" },
  ];

  const adminDocs = [
    { id: 'pengajuan_sidang', label: "Formulir Pengajuan Sidang" },
    { id: 'bukti_bayar', label: "Bukti Pembayaran Registrasi" },
    { id: 'bebas_pus_univ', label: "Bebas Pinjaman Perpustakaan Univ" },
    { id: 'bebas_pus_fak', label: "Bebas Pinjaman Perpustakaan Fak" },
    { id: 'bukti_pengajuan_judul', label: "Bukti pengajuan Topik/Judul" },
    { id: 'skpi', label: "SKPI" },
    { id: 'biodata_sidang', label: "Biodata Sidang" },
    { id: 'foto', label: "Foto Hitam Putih Cerah" },
    { id: 'pengantar_ijazah', label: "Surat Pengantar Ijazah" },
    { id: 'print_skripsi', label: "Print Out Skripsi 3 buah" },
    { id: 'flyer', label: "FLYER Skripsi" },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  // ================= FETCH DATA =================

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Ambil proposal user
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!proposal) {
        setProposalStatus("missing");
        setProposalId(null);
        setDocuments({});
        return;
      }

      setProposalStatus("found");
      setProposalId(proposal.id);

      // 2. Ambil dokumen berdasarkan proposal_id
      const { data: docs } = await supabase
        .from('seminar_documents')
        .select('*')
        .eq('proposal_id', proposal.id);

      if (docs) {
        const map: { [key: string]: DocumentData } = {};
        docs.forEach(d => {
          map[d.nama_dokumen] = {
            id: d.id,
            status: d.status,
            file_url: d.file_url
          };
        });
        setDocuments(map);
      }

    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= UPLOAD =================

  const handleUpload = async (docId: string, file: File) => {
    if (!proposalId) {
      alert("⚠️ Upload proposal terlebih dahulu.");
      return;
    }

    const confirmUpload = window.confirm(`Unggah dokumen ${file.name}?`);
    if (!confirmUpload) return;

    try {
      setLoading(true);
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx

      const filePath = `${proposalId}/${docId}_${Date.now()}.pdf`;

=======
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan");
      
      // Menggunakan timestamp agar nama file unik
      const filePath = `${user.id}/${docId}_${Date.now()}.pdf`;

>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
      // Upload storage
      const { error: storageError } = await supabase.storage
        .from('docseminar')
        .upload(filePath, file, { upsert: true });

      if (storageError) throw storageError;

      // Simpan DB
      const { error: dbError } = await supabase
        .from('seminar_documents')
        .upsert({
          proposal_id: proposalId,
          nama_dokumen: docId,
          file_url: filePath,
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
          status: 'Menunggu Verifikasi'
=======
          status: 'Menunggu Verifikasi' // Default status setelah upload
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
        }, { onConflict: 'proposal_id,nama_dokumen' });

      if (dbError) throw dbError;

<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
      alert("✅ Berhasil diunggah");
=======
      alert("✅ Berhasil diunggah. Menunggu verifikasi Tendik.");
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
      await fetchInitialData();

    } catch (error: any) {
      console.error(error);
      alert("❌ Gagal upload: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= DELETE =================

  const handleDelete = async (docId: string, filePath: string) => {
    if (!window.confirm("Hapus file ini?")) return;
    if (!proposalId) return;

    try {
      setLoading(true);

      await supabase.storage.from('docseminar').remove([filePath]);

      await supabase
        .from('seminar_documents')
        .delete()
        .match({
          proposal_id: proposalId,
          nama_dokumen: docId
        });

      await fetchInitialData();

    } catch (error: any) {
      alert("❌ Gagal hapus: " + error.message);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
  // ================= PROGRESS =================

  const countLengkap = (docList: typeof academicDocs) => {
    return docList.filter(d => documents[d.id]?.status === 'Lengkap').length;
  };

  const currentAcademic = countLengkap(academicDocs);
  const currentAdmin = countLengkap(adminDocs);
  const totalLengkap = currentAcademic + currentAdmin;
  const percentage = Math.round((totalLengkap / 17) * 100);
=======
  // ================= PROGRESS CALCULATION =================
  
  // Fungsi ini HANYA menghitung yang statusnya 'Lengkap' (Verified)
  const countVerified = (docList: typeof academicDocs) => {
    return docList.filter(d => documents[d.id]?.status === 'Lengkap').length;
  };

  const verifiedAcademic = countVerified(academicDocs);
  const verifiedAdmin = countVerified(adminDocs);
  
  const totalVerified = verifiedAcademic + verifiedAdmin;
  const totalDocs = 17; // Total semua dokumen
  const percentage = Math.round((totalVerified / totalDocs) * 100);
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx

  // ================= SUBMIT SEMINAR =================

  const handleSubmitSeminar = async () => {
    if (!proposalId) return;

    const confirm = window.confirm("Ajukan seminar sekarang?");
    if (!confirm) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('seminar_requests')
        .insert({
          proposal_id: proposalId,
          tipe: 'seminar',
          status: 'Menunggu Penjadwalan'
        });

      if (error) throw error;

      alert("✅ Seminar berhasil diajukan!");

    } catch (error: any) {
      console.error(error);
      alert("❌ Gagal mengajukan seminar");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-slate-700 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-full">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <Bell size={20} className="text-gray-400" />
        </header>

        <div className="flex-1 flex flex-col p-8 overflow-hidden">

          {/* WARNING */}
          {proposalStatus === "missing" && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertCircle size={24} />
              <div>
                <h3 className="font-bold">Proposal Belum Ditemukan</h3>
                <p className="text-sm">Silakan unggah proposal terlebih dahulu.</p>
              </div>
            </div>
          )}

<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
          {/* PROGRESS */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6 shrink-0 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 mb-2">Kelengkapan Dokumen Seminar</h1>
              <p className="text-lg font-bold text-gray-800 mb-4">{totalLengkap} dari 17 <span className="text-gray-400 font-medium">dokumen lengkap</span></p>
=======
          {/* PROGRESS CARD (UPDATED UI) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6 shrink-0 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 mb-2">Kelengkapan Dokumen Seminar</h1>
              <p className="text-lg font-bold text-gray-800 mb-4">
                {totalVerified} dari {totalDocs} <span className="text-gray-400 font-medium">dokumen terverifikasi</span>
              </p>
              {/* Linear Progress Bar */}
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-700 ease-out" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
=======

            {/* Circular Progress (Donut Chart) */}
            <div className="ml-12 relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle cx="64" cy="64" r="58" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                {/* Progress Circle */}
                <circle 
                  cx="64" cy="64" r="58" 
                  stroke="#2563eb" 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray="364.4" 
                  strokeDashoffset={364.4 - (364.4 * percentage) / 100} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out" 
                />
              </svg>
              <span className="absolute text-3xl font-bold text-blue-600">{percentage}%</span>
            </div>
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
          </div>

          {/* LIST */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 p-8 space-y-10 custom-scrollbar">

              {/* Akademik */}
              <section>
                <div className="flex items-center justify-between mb-6 border-b pb-2">
                  <div className="flex items-center gap-3">
                    <Layout className="text-blue-400" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">Akademik</h2>
                  </div>
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
                  <span className="text-sm font-bold text-gray-400">{currentAcademic}/6 Lengkap</span>
=======
                  <span className="text-sm font-bold text-gray-400">{verifiedAcademic}/6 Terverifikasi</span>
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
                </div>
                <div className="space-y-1">
                  {academicDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      {...doc}
                      data={documents[doc.id]}
                      onUpload={(f: File) => handleUpload(doc.id, f)}
                      onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')}
                    />
                  ))}
                </div>
              </section>

              {/* Administrasi */}
              <section>
                <div className="flex items-center justify-between mb-6 border-b pb-2">
                  <div className="flex items-center gap-3">
                    <Layout className="text-blue-400" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">Administrasi</h2>
                  </div>
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
                  <span className="text-sm font-bold text-gray-400">{currentAdmin}/11 Lengkap</span>
=======
                  <span className="text-sm font-bold text-gray-400">{verifiedAdmin}/11 Terverifikasi</span>
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
                </div>
                <div className="space-y-1">
                  {adminDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      {...doc}
                      data={documents[doc.id]}
                      onUpload={(f: File) => handleUpload(doc.id, f)}
                      onDelete={() => handleDelete(doc.id, documents[doc.id]?.file_url || '')}
                    />
                  ))}
                </div>
              </section>

              <div className="pt-6 border-t flex justify-end">
                <button
                  onClick={handleSubmitSeminar}
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
                  disabled={percentage < 100 || loading}
                  className={`px-10 py-3 rounded-lg font-bold transition ${
                    percentage === 100
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400'
=======
                  // Tombol hanya aktif jika persentase 100% (Semua status = Lengkap)
                  disabled={percentage < 100 || loading}
                  className={`px-10 py-3 rounded-lg font-bold transition ${
                    percentage === 100
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
                  }`}
                >
                  Ajukan Seminar
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
// ================= ROW =================
=======
// ================= ROW COMPONENT =================
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx

function DocumentRow({ label, subLabel, data, onUpload, onDelete }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Status dari database
  const status = data?.status || 'Belum Lengkap';
  
  // Helper variables
  const isPending = status === 'Menunggu Verifikasi';
  const isComplete = status === 'Lengkap';
  const hasFile = !!data?.file_url;

  const handleView = async () => {
    if (!data?.file_url) return;
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
    const { data: signed } = await supabase.storage
      .from('docseminar')
      .createSignedUrl(data.file_url, 120);

    if (signed?.signedUrl) {
      window.open(signed.signedUrl, '_blank');
    }
=======

    const { data: signed, error } = await supabase.storage
      .from('docseminar')
      .createSignedUrl(data.file_url, 300); // URL valid 5 menit

    if (error || !signed?.signedUrl) {
      alert("Gagal membuka file");
      return;
    }

    // Force download trick
    const link = document.createElement("a");
    link.href = signed.signedUrl;
    link.download = data.file_url.split("/").pop() || "dokumen.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 border-b border-gray-50 last:border-0 transition-colors">
      <div className="flex items-center gap-4 flex-1">
<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
=======
        {/* Ikon Status: Hijau jika Lengkap, Kuning jika Menunggu, Merah jika Kosong */}
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isComplete ? 'bg-emerald-100 text-emerald-600' :
          isPending ? 'bg-yellow-100 text-yellow-600' :
          'bg-red-100 text-red-500'
        }`}>
          {isComplete ? <Check size={20} /> : isPending ? <Clock size={20} /> : <X size={20} />}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{label}</p>
          {subLabel && <p className="text-[11px] text-gray-400 font-medium">{subLabel}</p>}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {hasFile && (
          <button onClick={handleView} className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-white shadow-sm transition">
            Lihat File
          </button>
        )}

        {isPending && (
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
            <span className="text-[10px] font-bold text-yellow-600 uppercase">
              Menunggu Verifikasi
            </span>
          </div>
        )}

<<<<<<< HEAD:app/(mahasiswa)/uploaddokumen/page.tsx
        {status === 'Belum Lengkap' && (
          <span className="text-[12px] font-bold text-red-500 uppercase mr-4">
            Belum Lengkap
=======
        {/* Jika verified, tampilkan status Lengkap */}
        {isComplete && (
          <span className="text-[12px] font-bold text-emerald-600 uppercase mr-4">
            Terverifikasi
          </span>
        )}

        {status === 'Belum Lengkap' && (
          <span className="text-[12px] font-bold text-red-500 uppercase mr-4">
            Belum Upload
>>>>>>> 2eb017b2912eadf62a9a8f8c35198d2e39235d76:app/mahasiswa/uploaddokumen/page.tsx
          </span>
        )}

        {hasFile ? (
          <button onClick={onDelete} className="px-6 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold active:scale-95 transition">
            Hapus
          </button>
        ) : (
          <>
            <button onClick={() => fileRef.current?.click()} className="px-6 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition shadow-sm">
              Unggah
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}