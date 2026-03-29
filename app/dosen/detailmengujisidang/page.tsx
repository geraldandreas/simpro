"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SidebarDosen from "@/components/sidebar-dosen"; 
import NotificationBell from '@/components/notificationBell'; 
import { 
  ArrowLeft, Download, User, 
  Lock, CheckCircle2, UploadCloud, FileText 
} from "lucide-react";

export default function DetailPenilaianSidangDosen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sidangRequestId = searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [studentData, setStudentData] = useState<any>(null);
  const [skripsiUrl, setSkripsiUrl] = useState<string | null>(null);

  // Form State
  const [nilai, setNilai] = useState<string>("");
  const [matriksFile, setMatriksFile] = useState<File | null>(null);
  const [existingMatriksUrl, setExistingMatriksUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sidangRequestId) return;
    fetchData();
  }, [sidangRequestId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Data Sidang & Proposal
      const { data: sidang, error: sidangErr } = await supabase
        .from('sidang_requests')
        .select(`
          id,
          proposal:proposals (
            id, judul,
            user:profiles (id, nama, npm, avatar_url)
          )
        `)
        .eq('id', sidangRequestId)
        .single();

      if (sidangErr || !sidang) throw new Error("Data sidang tidak ditemukan.");
      
      const proposalId = (sidang.proposal as any).id;
      const mhs = (sidang.proposal as any).user;

      setStudentData({
        judul: (sidang.proposal as any).judul,
        nama: mhs.nama,
        npm: mhs.npm,
        avatar_url: mhs.avatar_url
      });

      // 2. Fetch File Skripsi Final dari dokumen verifikasi tendik
      const { data: docSidang } = await supabase
        .from('sidang_documents_verification')
        .select('file_url')
        .eq('proposal_id', proposalId)
        .eq('nama_dokumen', 'file_skripsi_final')
        .single();

      if (docSidang?.file_url) {
        setSkripsiUrl(docSidang.file_url);
      }

      // 3. Cek apakah dosen sudah pernah memberikan nilai
      const { data: feedback } = await supabase
        .from('sidang_feedbacks')
        .select('*')
        .eq('sidang_request_id', sidangRequestId)
        .eq('dosen_id', user.id)
        .maybeSingle();

      if (feedback) {
        setNilai(feedback.nilai.toString());
        setExistingMatriksUrl(feedback.file_matriks);
        setIsLocked(true); // Kunci form jika sudah ada data
      }

    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Handler Download Skripsi Mahasiswa
  const handleDownloadSkripsi = async () => {
    if (!skripsiUrl) return;
    try {
      const { data, error } = await supabase.storage.from('docseminar').createSignedUrl(skripsiUrl, 3600);
      if (error || !data?.signedUrl) throw new Error();
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert("Gagal membuka file skripsi.");
    }
  };

  // 🔥 Handler View Matriks Penilaian Dosen
  const handleViewMatriks = async () => {
    if (!existingMatriksUrl) return;
    try {
      const { data, error } = await supabase.storage.from('docseminar').createSignedUrl(existingMatriksUrl, 3600);
      if (error || !data?.signedUrl) throw new Error();
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert("Gagal membuka matriks penilaian.");
    }
  };

  // 🔥 Handler Submit Penilaian
  const handleSubmit = async () => {
    if (!nilai || isNaN(Number(nilai)) || Number(nilai) < 0 || Number(nilai) > 100) {
      alert("Harap masukkan nilai yang valid (0 - 100).");
      return;
    }
    if (!matriksFile && !existingMatriksUrl) {
      alert("Harap unggah file Matriks Penilaian (PDF).");
      return;
    }

    if (!window.confirm("Yakin ingin menyimpan penilaian ini? Data yang disimpan akan langsung dikunci.")) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let finalMatriksPath = existingMatriksUrl;

      // Jika dosen mengunggah file matriks baru
      if (matriksFile) {
        const filePath = `sidang_matriks/${sidangRequestId}_${user.id}_${Date.now()}.pdf`;
        const { error: uploadErr } = await supabase.storage.from('docseminar').upload(filePath, matriksFile);
        if (uploadErr) throw uploadErr;
        finalMatriksPath = filePath;
      }

      // Simpan ke database
      const { error: dbErr } = await supabase
        .from('sidang_feedbacks')
        .upsert({
          sidang_request_id: sidangRequestId,
          dosen_id: user.id,
          nilai: Number(nilai),
          file_matriks: finalMatriksPath
        }, { onConflict: 'sidang_request_id,dosen_id' });

      if (dbErr) throw dbErr;

      setIsLocked(true);
      setExistingMatriksUrl(finalMatriksPath);
      alert("Penilaian berhasil disimpan!");

    } catch (err: any) {
      alert("Gagal menyimpan penilaian: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F4F7FE]">
      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-700 overflow-hidden">
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-end px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase pr-2">Simpro</span>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-5 mb-10">
            <button onClick={() => router.back()} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Penilaian Sidang Akhir</h1>
              <p className="text-slate-500 font-medium mt-2 tracking-normal normal-case">Berikan nilai akhir dan unggah matriks penilaian untuk mahasiswa ini.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* ================= LEFT PANEL (PROFILE) ================= */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10 flex flex-col items-center text-center relative overflow-hidden group sticky top-28">
                <div className="w-32 h-32 rounded-[2rem] bg-slate-100 flex items-center justify-center shadow-inner mb-6 relative overflow-hidden border-4 border-white">
                  {studentData?.avatar_url ? (
                    <Image src={studentData.avatar_url} alt="Profile" fill className="object-cover" />
                  ) : (
                    <User size={50} className="text-slate-300" />
                  )}
                </div>
                
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{studentData?.nama || "Nama Mahasiswa"}</h2>
                <p className="text-xs font-black text-blue-600 tracking-[0.2em] bg-blue-50 px-4 py-1.5 rounded-full mt-3">{studentData?.npm || "-"}</p>

                <div className="w-full h-px bg-slate-100 my-8"></div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dokumen Skripsi Mahasiswa</p>
                <button 
                  onClick={handleDownloadSkripsi}
                  disabled={!skripsiUrl}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                    skripsiUrl ? 'bg-slate-900 hover:bg-blue-600 text-white active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Download size={16} /> 
                  {skripsiUrl ? "Unduh Skripsi Final" : "Belum Tersedia"}
                </button>
              </div>
            </div>

            {/* ================= RIGHT PANEL (FORM PENILAIAN) ================= */}
            <div className="lg:col-span-8 space-y-6">
              
              {isLocked && (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-5 shadow-sm">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Data Telah Disimpan & Terkunci</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Penilaian akhir untuk sidang ini telah Anda konfirmasi dan dikunci oleh sistem. Jika terdapat kesalahan fatal, harap hubungi Kaprodi.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] border border-white shadow-xl p-10">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-8">Lembar Penilaian</h3>

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic font-bold text-slate-600 text-sm leading-relaxed normal-case mb-10 shadow-inner">
                  "{studentData?.judul || "Judul belum tersedia"}"
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* INPUT NILAI */}
                  <div>
                     <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                        <CheckCircle2 size={14} className="text-blue-500" /> Nilai Akhir (0-100)
                     </label>
                     <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={nilai}
                        onChange={(e) => setNilai(e.target.value)}
                        disabled={isLocked}
                        placeholder="Contoh: 85"
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-black text-2xl text-slate-800 focus:border-blue-400 shadow-inner transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                     />
                  </div>

                  {/* INPUT MATRIKS PENILAIAN */}
                  <div>
                     <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                        <UploadCloud size={14} className="text-emerald-500" /> Upload Matriks (PDF)
                     </label>
                     
                     {isLocked && existingMatriksUrl ? (
                        <button 
                          onClick={handleViewMatriks}
                          className="w-full h-[76px] px-6 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-100 flex items-center justify-center gap-2"
                        >
                          <FileText size={18} /> File Matriks Tersimpan
                        </button>
                     ) : (
                        <div 
                          onClick={() => !isLocked && fileInputRef.current?.click()}
                          className={`w-full h-[76px] px-6 border-2 border-dashed rounded-[1.5rem] flex items-center justify-center font-black text-[10px] uppercase tracking-widest transition-all ${
                            matriksFile 
                              ? 'bg-blue-50 border-blue-300 text-blue-600' 
                              : 'bg-slate-50 border-slate-300 text-slate-400 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                          }`}
                        >
                          {matriksFile ? (
                            <span className="truncate max-w-[200px] flex items-center gap-2"><CheckCircle2 size={16}/> {matriksFile.name}</span>
                          ) : (
                            "Pilih File Dokumen"
                          )}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".pdf" 
                            onChange={(e) => e.target.files?.[0] && setMatriksFile(e.target.files[0])}
                          />
                        </div>
                     )}
                  </div>
                </div>

                {!isLocked && (
                  <div className="pt-6 border-t border-slate-100">
                    <button 
                      onClick={handleSubmit}
                      disabled={saving}
                      className="w-full py-5 bg-blue-600 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Memproses Data..." : "Simpan & Kunci Penilaian"}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}