"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import useSWR from "swr"; 
import { useRouter } from "next/navigation";
import { sendNotification } from "@/lib/notificationUtils";
import { supabase } from "@/lib/supabaseClient";
import { 
  CloudUpload, 
  FileText, 
  ChevronDown, 
  Trash2, 
  Info,
  UserCheck,
  ShieldCheck,
  Lock,
  Send
} from "lucide-react";

// --- TYPES ---
interface ProposalFile {
  name: string;
  url: string;           
  uploadedAt: string;
  status: string;
  storagePath?: string; 
  id?: string; 
  is_locked?: boolean;          
}

interface Dosen {
  id: string;
  nama: string;
}

// ================= FETCHER SWR =================
const fetcher = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("npm, avatar_url, alamat")
    .eq("id", user.id)
    .single();

  const isProfileComplete = !!(profile?.npm && profile?.avatar_url && profile?.alamat);

  const { data: propData } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let proposalFormatted: ProposalFile | null = null;
  let recData: any = null;
  let previewUrl: string | null = null;

  if (propData) {
    proposalFormatted = {
      name: propData.file_path?.split("/").pop() || "Dokumen Proposal",
      url: "", 
      uploadedAt: new Date(propData.created_at).toLocaleDateString("id-ID"),
      status: propData.status,
      storagePath: propData.file_path,
      id: propData.id,
      is_locked: propData.is_locked, 
    };

    if (propData.file_path) {
      const { data: signData } = await supabase.storage
        .from("proposals")
        .createSignedUrl(propData.file_path, 3600);
      if (signData?.signedUrl) previewUrl = signData.signedUrl;
    }

    const { data: recs } = await supabase
      .from("proposal_recommendations")
      .select("dosen_id, tipe")
      .eq("proposal_id", propData.id);
    
    recData = recs;
  }

  const { data: dosenData } = await supabase
    .from("profiles")
    .select("id, nama")
    .in("role", ["dosen", "kaprodi"])
    .order("nama");

  return {
    isProfileComplete,
    proposalRaw: propData,
    proposalFormatted,
    recData,
    previewUrl,
    dosenList: (dosenData as Dosen[]) || []
  };
};

export default function UploadProposalMahasiswaClient() {
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR('upload_proposal_mhs', fetcher, {
    revalidateOnFocus: true,
  });

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [localProposal, setLocalProposal] = useState<ProposalFile | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [judulSkripsi, setJudulSkripsi] = useState("");
  const [bidangSkripsi, setBidangSkripsi] = useState("AI");
  const [pembimbing1, setPembimbing1] = useState("");
  const [pembimbing2, setPembimbing2] = useState("");

  React.useEffect(() => {
    if (data?.proposalRaw) {
      setJudulSkripsi(data.proposalRaw.judul);
      setBidangSkripsi(data.proposalRaw.bidang);
    }
    if (data?.recData) {
      data.recData.forEach((rec: any) => {
        if (rec.tipe === "pembimbing1") setPembimbing1(rec.dosen_id);
        if (rec.tipe === "pembimbing2") setPembimbing2(rec.dosen_id);
      });
    }
  }, [data]);

  const activeProposal = localProposal || data?.proposalFormatted;
  const activePreviewUrl = localPreviewUrl || data?.previewUrl;
  const isUploaded = !!activeProposal;
  
  // Jika file sudah tersimpan di server, berarti sudah disubmit
  const isSubmitted = !!data?.proposalFormatted?.id;
  const listDosen = data?.dosenList || [];

  // ================= HANDLERS =================
  const handleSelectFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileToUpload(file);
    setLocalProposal({
      name: file.name,
      url,
      uploadedAt: new Date().toLocaleDateString("id-ID"),
      status: "Draft (Belum Submit)", 
      is_locked: false
    });
    setLocalPreviewUrl(url);
  };

  // 🔥 FUNGSI BARU: GABUNGAN SUBMIT DOKUMEN & DOSEN 🔥
  const handleSubmitAll = async () => {
    // Validasi Lengkap Sebelum Eksekusi
    if (!fileToUpload && !data?.proposalFormatted) return alert("Pilih dokumen proposal terlebih dahulu.");
    if (!judulSkripsi.trim()) return alert("Silakan isi judul skripsi.");
    if (!pembimbing1) return alert("Silakan pilih minimal Pembimbing Utama.");
    if (pembimbing1 === pembimbing2) return alert("Pembimbing Utama dan Pendamping tidak boleh sama.");

    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      // Ambil nama profil terbaru agar notifikasi menggunakan nama yang benar
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('nama')
        .eq('id', user.id)
        .single();
      const mhsNama = currentProfile?.nama || user?.email || "Seorang mahasiswa";

      let storagePath = data?.proposalFormatted?.storagePath;

      // 1. Upload File (Jika ada file baru)
      if (fileToUpload) {
        storagePath = `${user.id}/${Date.now()}-${fileToUpload.name}`;
        const { error: uploadError } = await supabase.storage.from("proposals").upload(storagePath, fileToUpload);
        if (uploadError) throw uploadError;
      }

      // 2. Insert ke tabel Proposals (Status otomatis Menunggu Persetujuan Dosbing & Terkunci)
      const { data: newProposal, error: insertError } = await supabase
        .from("proposals")
        .insert({
          user_id: user.id,
          judul: judulSkripsi,
          bidang: bidangSkripsi,
          file_path: storagePath,
          status: "Menunggu Persetujuan Dosbing",
          is_locked: true,
        })
        .select('id') // Ambil ID proposal yang baru dibuat
        .single();

      if (insertError) throw insertError;
      const proposalId = newProposal.id;

      // 3. Insert ke tabel Proposal Recommendations (Dosen Pembimbing)
      const inserts = [{ proposal_id: proposalId, dosen_id: pembimbing1, tipe: "pembimbing1" }];
      if (pembimbing2) inserts.push({ proposal_id: proposalId, dosen_id: pembimbing2, tipe: "pembimbing2" });
      
      const { error: recError } = await supabase.from("proposal_recommendations").insert(inserts);
      if (recError) throw recError;

      // 4. Kirim Notifikasi ke Kaprodi
      const { data: kaprodi } = await supabase.from('profiles').select('id').eq('role', 'kaprodi').maybeSingle();
      if (kaprodi) {
        await sendNotification(kaprodi.id, "Usulan Judul Baru", `${mhsNama} telah mengajukan judul proposal baru: "${judulSkripsi}".`);
      }

      alert("Dokumen dan Pengajuan Pembimbing berhasil dikirim!");
      setLocalProposal(null); 
      setFileToUpload(null);
      mutate(); 
    } catch (error: any) {
      alert(`Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus draft ini?")) return;
    setLocalProposal(null);
    setLocalPreviewUrl(null);
    setFileToUpload(null);
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto outline-none focus:outline-none">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Unggah Proposal Skripsi</h1>
        <p className="text-slate-500 mt-2 font-medium">Lengkapi dokumen dan ajukan pembimbing untuk memulai skripsi Anda.</p>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
           <div className="lg:col-span-8 h-[400px] bg-slate-200 rounded-[2.5rem]"></div>
           <div className="lg:col-span-4 space-y-8">
              <div className="h-[200px] bg-slate-200 rounded-[2rem]"></div>
              <div className="h-[400px] bg-slate-200 rounded-[2.5rem]"></div>
           </div>
        </div>
      ) : !data?.isProfileComplete ? (
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-10 text-center animate-in fade-in zoom-in duration-500">
           <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <Lock size={40} strokeWidth={2.5} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Akses Terkunci</h2>
           <p className="text-slate-500 max-w-md font-medium leading-relaxed mb-8">
              Mohon lengkapi Foto Profil, NPM dan Alamat Lengkap Anda terlebih dahulu di halaman pengaturan sebelum dapat mengunggah proposal skripsi.
           </p>
           <Link href="/settings">
              <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                 Lengkapi Profil Sekarang
              </button>
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            {activeProposal?.is_locked && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in duration-500">
                <Lock size={18} />
                <p className="text-xs font-bold tracking-tight">Dokumen dan data skripsi telah dikunci untuk proses review.</p>
              </div>
            )}

            <div className={`relative group transition-all ${isUploaded ? 'h-auto' : 'h-[400px]'}`}>
              <div className={`h-full bg-white p-12 rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center
                ${isUploaded ? 'border-blue-100 bg-blue-50/20' : 'border-slate-300 hover:border-blue-400 hover:bg-white'}
                ${activeProposal?.is_locked ? 'opacity-80' : ''}`}>
                
                <div className={`p-6 rounded-3xl mb-6 shadow-xl shadow-blue-100 transition-transform group-hover:scale-110
                  ${isUploaded ? 'bg-blue-600 text-white' : 'bg-white text-blue-500 border border-slate-100'}`}>
                  <CloudUpload size={40} />
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  {isUploaded ? "File Proposal Terdeteksi" : "Tarik & Lepas file PDF di sini"}
                </h2>
                <p className="text-slate-400 text-sm mb-6 max-w-xs">
                  Format file harus PDF dengan ukuran maksimal 5MB.
                </p>

                <label 
                  className={`px-10 py-3.5 rounded-2xl font-bold shadow-lg transition flex items-center gap-2 
                  ${activeProposal?.is_locked 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer active:scale-95'}`}
                >
                  {isUploaded ? (activeProposal?.is_locked ? "Dokumen Terkunci" : "Ganti File") : "Pilih Dokumen"}
                  {!activeProposal?.is_locked && (
                    <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files && handleSelectFile(e.target.files[0])} />
                  )}
                </label>
              </div>
            </div>

            {isUploaded && activeProposal && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                
                {/* PANEL STATUS SAJA (Tombol Submit dipindah ke bawah) */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Status Dokumen</p>
                      <p className="text-xs text-slate-500 font-medium">{isSubmitted ? "Telah Disubmit" : "Draft (Belum disubmit)"}</p>
                    </div>
                  </div>
                  
                  {/* Hanya tombol hapus file jika masih draft */}
                  {!isSubmitted && (
                    <button onClick={handleDeleteDraft} disabled={loading} className="p-3 bg-red-50 text-sm font-black text-red-500 rounded-2xl hover:bg-red-100 transition active:scale-95">
                     Hapus Draft
                    </button>
                  )}
                </div>

                <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <FileText className="text-blue-500" size={18} />
                        <span className="text-sm font-bold text-slate-700">{activeProposal.name}</span>
                     </div>
                  </div>
                  {activePreviewUrl ? (
                    <iframe src={activePreviewUrl} className="w-full h-[700px] border-none" title="Pratinjau Proposal" />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-400 italic text-sm">Pratinjau tidak tersedia</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8">
            {isUploaded && activeProposal && (
              <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Info size={20} className="text-blue-500" />
                  Detail Dokumen
                </h2>
                <div className="space-y-5">
                  <DetailCard label="File" value={activeProposal.name} />
                  <DetailCard label="Tanggal" value={activeProposal.uploadedAt} />
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Verifikasi</p>
                     <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider
                      ${isSubmitted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {activeProposal.status}
                     </span>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
              <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <UserCheck size={22} className="text-blue-600" />
                Data & Pembimbing
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Judul Skripsi</label>
                  <textarea
                    value={judulSkripsi}
                    onChange={(e) => setJudulSkripsi(e.target.value)}
                    disabled={isSubmitted}
                    placeholder="Masukkan judul skripsi..."
                    className="w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 bg-slate-50/50 outline-none transition-all min-h-[100px] resize-none disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Bidang Kajian</label>
                  <div className="relative group">
                    <select
                      value={bidangSkripsi}
                      onChange={(e) => setBidangSkripsi(e.target.value)}
                      disabled={isSubmitted}
                      className="w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50/50 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none appearance-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {["AI", "Machine Learning", "Data Science", "Jaringan Komputer", "Internet of Things", "Cyber Security", "Rancang Bangun", "Lainnya"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {!isSubmitted && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors" size={18} />}
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-4"></div>

                {[
                  { id: 'p1', label: 'Pembimbing Utama', state: pembimbing1, setState: setPembimbing1 },
                  { id: 'p2', label: 'Co-Pembimbing', state: pembimbing2, setState: setPembimbing2 }
                ].map((p) => (
                  <div key={p.id} className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{p.label}</label>
                    <div className="relative group">
                      <select
                        value={p.state}
                        onChange={(e) => p.setState(e.target.value)}
                        disabled={isSubmitted}
                        className="w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50/50 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                      >
                        <option value="">-- Pilih Dosen --</option>
                        {listDosen.map((dosen) => (
                          <option key={dosen.id} value={dosen.id}>{dosen.nama}</option>
                        ))}
                      </select>
                      {!isSubmitted && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />}
                    </div>
                  </div>
                ))}

                {/* 🔥 TOMBOL SUBMIT GABUNGAN 🔥 */}
                <button
                  onClick={handleSubmitAll}
                  disabled={isSubmitted || loading || (!fileToUpload && !data?.proposalFormatted)}
                  className={`w-full py-4 flex items-center justify-center gap-2 rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl transition-all active:scale-95 mt-4
                    ${isSubmitted 
                      ? "bg-green-100 text-green-600 shadow-none" 
                      : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"}`}
                >
                  {isSubmitted ? (
                    "Pengajuan Selesai"
                  ) : loading ? (
                    "Memproses..."
                  ) : (
                    <>
                      <Send size={16} /> Kirim Pengajuan
                    </>
                  )}
                </button>

              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-700 leading-tight break-all">{value}</p>
    </div>
  );
}