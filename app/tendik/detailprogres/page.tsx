"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, Bell, ArrowLeft, FileText, 
  CheckCircle, Clock, MessageSquare, Eye, Check, X, AlertCircle 
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SidebarTendik from "@/components/sidebar-tendik"; 

// ================= TYPES =================

interface StudentDetail {
  id: string;
  judul: string;
  user: {
    nama: string;
    npm: string;
  };
}

interface DocumentData {
  id: string;
  nama_dokumen: string;
  status: string; 
  created_at: string; // ✅ FIX: Sesuai nama kolom di DB
  file_url: string;
}

interface GuidanceSession {
  id: string;
  sesi_ke: number;
  tanggal: string;
  dosen_nama: string;
}

interface ActivityLog {
  date: string;
  desc: string;
}

// ⚠️ Pastikan ID di sini sama persis dengan yang disimpan di kolom 'nama_dokumen' di database
const REQUIRED_DOCS = [
  { id: 'transkrip_nilai', label: "Transkrip Nilai" },
  { id: 'berita_acara_bimbingan', label: "Berita Acara Bimbingan" },
  { id: 'matriks_perbaikan', label: "Formulir Matriks Perbaikan Skripsi" },
  { id: 'bukti_pengajuan_judul', label: "Bukti Pengajuan Judul" },
  { id: 'pengajuan_sidang', label: "Formulir Pengajuan Sidang" },
  { id: 'bukti_bayar', label: "Bukti Pembayaran" },
  { id: 'bebas_pus_univ', label: "Bebas Pinjaman Perpus Univ" },
  { id: 'bebas_pus_fak', label: "Bebas Pinjaman Perpus Fakultas" },
  { id: 'toefl', label: "Sertifikat TOEFL" },
  { id: 'print_skripsi', label: "Print Out Skripsi" },
  { id: 'flyer', label: "FLYER Skripsi" }
];

export default function DetailProgresTendikPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const proposalId = searchParams.get("id");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [bimbingan, setBimbingan] = useState<GuidanceSession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahap, setTahap] = useState("Proses Bimbingan");
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);

  // ================= FETCH DATA =================
  
  const fetchData = async () => {
    if (!proposalId) return;
    
    try {
      // 1. Ambil Detail Proposal
      // NOTE: Menggunakan !inner atau !fk jika ada masalah relasi. 
      // Jika masih error foreign key, coba hapus '!proposals_user_id_fkey' dan biarkan 'user:profiles(...)' saja.
      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select(`
          id, judul,
          user:profiles (nama, npm), 
          seminar_requests ( tipe, status )
        `)
        .eq("id", proposalId)
        .single();

      if (propError) {
        console.error("Error Proposal:", propError);
        return;
      }

      setStudent({
        id: propData.id,
        judul: propData.judul,
        user: {
          nama: propData.user?.nama || "-",
          npm: propData.user?.npm || "-"
        }
      });

      // Logic Tahap Sederhana
      const seminar = propData.seminar_requests?.find((r: any) => r.tipe === 'seminar');
      if (seminar?.status === 'Lengkap') setTahap("Kesiapan Seminar");
      else if (seminar?.status === 'Menunggu Verifikasi') setTahap("Verifikasi Berkas");
      else if (seminar?.status === 'Dijadwalkan') setTahap("Seminar Dijadwalkan");

      // 2. Ambil Status Dokumen
      const { data: docData, error: docError } = await supabase
        .from("seminar_documents")
        .select("id, nama_dokumen, status, created_at, file_url") 
        .eq("proposal_id", proposalId);

      if (docError) console.error("Error Docs:", docError);
      setDocuments(docData || []);

      // 3. Ambil Riwayat Bimbingan
      const { data: bimData } = await supabase
        .from("guidance_sessions")
        .select(`
          id, sesi_ke, tanggal, 
          dosen:profiles (nama)
        `)
        .eq("proposal_id", proposalId)
        .order("tanggal", { ascending: false })
        .limit(3);

      const mappedBim = (bimData || []).map((b: any) => ({
        id: b.id,
        sesi_ke: b.sesi_ke,
        tanggal: b.tanggal,
        dosen_nama: b.dosen?.nama || "-"
      }));
      setBimbingan(mappedBim);

      // 4. Log Aktivitas
      const logs = (docData || []).map((d: any) => ({
        date: d.created_at,
        desc: `${d.nama_dokumen.replace(/_/g, ' ')} diperbarui.`
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
      setActivities(logs);

    } catch (err) {
      console.error("System Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [proposalId]);

  // ================= ACTION HANDLERS =================

  // 1. Lihat File (Generate Signed URL)
  const handleViewFile = async (path: string) => {
    if (!path) return;
    
    // Normalisasi path jika perlu (menghapus prefix bucket jika tersimpan ganda)
    const cleanPath = path.replace(/^docseminar\//, ''); 

    try {
      const { data, error } = await supabase.storage
        .from('docseminar') // Pastikan nama bucket sesuai di Supabase Storage
        .createSignedUrl(cleanPath, 3600); // URL valid 1 jam
      
      if (error || !data?.signedUrl) {
        console.error("Storage Error:", error);
        alert("Gagal membuat link file. Pastikan file ada di storage.");
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (e) {
      alert("Error system saat membuka file.");
    }
  };

  // 2. Verifikasi / Tolak Dokumen
  const handleVerify = async (docId: string, newStatus: string) => {
    const action = newStatus === 'Lengkap' ? "menyetujui" : "menolak";
    if (!confirm(`Apakah Anda yakin ingin ${action} dokumen ini?`)) return;
    
    setProcessingDoc(docId);

    try {
      const { data: auth } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('seminar_documents')
        .update({ 
          status: newStatus, 
          verified_at: new Date().toISOString(),
          verified_by: auth.user?.id 
        })
        .eq('id', docId);

      if (error) throw error;
      
      // Refresh data agar UI update otomatis
      await fetchData(); 
      // alert(`Dokumen berhasil ${newStatus === 'Lengkap' ? 'diverifikasi' : 'ditolak'}`);
    } catch (e: any) {
      alert("Gagal update status: " + e.message);
    } finally {
      setProcessingDoc(null);
    }
  };

  // ================= HELPERS =================

  // Mencari data dokumen di state berdasarkan ID dokumen (misal: 'transkrip_nilai')
  const getDocData = (docIdName: string) => {
    return documents.find(d => d.nama_dokumen === docIdName) || null;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric"
    });
  };

  // ================= RENDER UI =================

  if (loading) return <div className="flex h-screen bg-[#F8F9FB] items-center justify-center text-gray-400">Memuat data...</div>;
  if (!student) return <div className="flex h-screen bg-[#F8F9FB] items-center justify-center text-gray-400">Data tidak ditemukan.</div>;

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans text-slate-700 overflow-hidden">
      <SidebarTendik />

      <div className="flex-1 ml-64 flex flex-col h-full">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" placeholder="Search" className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none" />
          </div>
          <div className="flex items-center gap-4">
             <Bell size={20} className="text-gray-400" />
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* Header Info Mahasiswa */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft size={24} className="text-gray-400 hover:text-gray-700" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{student.user.nama}</h1>
            </div>
            <p className="text-gray-400 font-medium text-sm ml-10 mb-4">NPM: {student.user.npm}</p>
            <h2 className="text-lg font-bold text-gray-800 ml-10 leading-snug max-w-4xl bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              {student.judul}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 ml-11">
            
            {/* KOLOM KIRI */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Card Tahap */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tahap Saat Ini</h3>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F9EFC7] text-[#8F7B46] rounded-full text-sm font-bold">
                  <CheckCircle size={16} className="text-[#8F7B46]" />
                  {tahap}
                </div>
              </div>

              {/* Card Verifikasi Dokumen */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Verifikasi Dokumen</h3>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {documents.filter(d => d.status === 'Lengkap').length} / {REQUIRED_DOCS.length} Valid
                  </span>
                </div>
                
                <div className="space-y-4">
                  {REQUIRED_DOCS.map((doc, idx) => {
                    const data = getDocData(doc.id);
                    const hasFile = !!data?.file_url;
                    const isProcessing = processingDoc === data?.id;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-3 rounded-lg transition-colors">
                        
                        {/* Nama Dokumen & Status */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                            data?.status === 'Lengkap' ? 'bg-green-100 text-green-600' : 
                            data?.status === 'Ditolak' ? 'bg-red-100 text-red-600' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {data?.status === 'Lengkap' ? <CheckCircle size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700">{doc.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {data ? 
                                (data.status === 'Lengkap' ? 'Terverifikasi' : 
                                 data.status === 'Ditolak' ? 'Ditolak' : 'Menunggu Verifikasi') 
                                : "Belum diunggah"}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          
                          {/* 1. VIEW FILE (Jika ada file) */}
                          {hasFile && (
                            <button 
                              onClick={() => handleViewFile(data!.file_url)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
                              title="Lihat Dokumen"
                            >
                              <Eye size={14} /> 
                              Lihat
                            </button>
                          )}

                          {/* 2. VERIFIKASI / STATUS */}
                          {data?.status === 'Lengkap' ? (
                            <span className="px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg uppercase tracking-wide">
                              Valid
                            </span>
                          ) : hasFile ? (
                            // Jika belum lengkap & ada file, tampilkan tombol Approve/Reject
                            <>
                              <button 
                                onClick={() => handleVerify(data!.id, 'Lengkap')}
                                disabled={isProcessing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                title="Setujui"
                              >
                                <Check size={14} />
                              </button>
                              
                              <button 
                                onClick={() => handleVerify(data!.id, 'Ditolak')}
                                disabled={isProcessing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition shadow-sm disabled:opacity-50"
                                title="Tolak"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-200">
                              -
                            </span>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN */}
            <div className="lg:col-span-1 space-y-8">
              
              {/* Riwayat Bimbingan */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Riwayat Bimbingan</h3>
                <div className="space-y-6">
                  {bimbingan.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada bimbingan.</p>}
                  {bimbingan.map((sesi) => (
                    <div key={sesi.id} className="flex gap-4 items-start">
                      <div className="mt-1 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                          <FileText size={16} />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Sesi {sesi.sesi_ke}</p>
                        <p className="text-xs text-gray-500 font-medium">{sesi.dosen_nama.split(',')[0]}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(sesi.tanggal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riwayat Aktivitas */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Aktivitas Terkini</h3>
                <div className="space-y-6">
                  {activities.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada aktivitas.</p>}
                  {activities.map((act, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="mt-1">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500"><Clock size={16} /></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 mb-0.5">{formatDate(act.date)}</p>
                        <p className="text-xs text-gray-600 leading-tight">{act.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}