"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sendNotification } from "@/lib/notificationUtils";
import NotificationBell from '@/components/notificationBell';
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/sidebar";
import { 
  CloudUpload, 
  FileText, 
  CheckCircle2, 
  ChevronDown, 
  Bell, 
  Trash2, 
  Info,
  UserCheck,
  ShieldCheck,
  Lock
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

export default function UploadProposalMahasiswaClient() {
  const [proposal, setProposal] = useState<ProposalFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [judulSkripsi, setJudulSkripsi] = useState("");
  const [bidangSkripsi, setBidangSkripsi] = useState("AI");
  const [listDosen, setListDosen] = useState<Dosen[]>([]);
  
  const [pembimbing1, setPembimbing1] = useState("");
  const [pembimbing2, setPembimbing2] = useState("");
  const [isDosenSubmitted, setIsDosenSubmitted] = useState(false);

  const isUploaded = !!proposal;

  // ================= LOAD DATA =================
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (propData) {
        setProposal({
          name: propData.file_path?.split("/").pop() || "Dokumen Proposal",
          url: "", 
          uploadedAt: new Date(propData.created_at).toLocaleDateString("id-ID"),
          status: propData.status,
          storagePath: propData.file_path,
          id: propData.id,
          is_locked: propData.is_locked, 
        });
        setJudulSkripsi(propData.judul);
        setBidangSkripsi(propData.bidang);

        if (propData.file_path) {
          const { data: signData } = await supabase.storage
            .from("proposals")
            .createSignedUrl(propData.file_path, 3600);
          if (signData?.signedUrl) setPreviewUrl(signData.signedUrl);
        }

        const { data: recData } = await supabase
          .from("proposal_recommendations")
          .select("dosen_id, tipe")
          .eq("proposal_id", propData.id);

        if (recData && recData.length > 0) {
          recData.forEach((rec: any) => {
            if (rec.tipe === "pembimbing1") setPembimbing1(rec.dosen_id);
            if (rec.tipe === "pembimbing2") setPembimbing2(rec.dosen_id);
          });
          setIsDosenSubmitted(true);
        }
      }

      const { data: dosenData } = await supabase
        .from("profiles")
        .select("id, nama")
        .in("role", ["dosen", "kaprodi"])
        .order("nama");

      if (dosenData) setListDosen(dosenData as Dosen[]);
    }
    fetchData();
  }, []);

  // ================= HANDLERS =================
  const handleSelectFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileToUpload(file);
    setProposal({
      name: file.name,
      url,
      uploadedAt: new Date().toLocaleDateString("id-ID"),
      status: "Draft (Belum Submit)", 
      is_locked: false
    });
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!proposal || !fileToUpload) return;
    if (!judulSkripsi) return alert("Silakan isi judul skripsi");

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const storagePath = `${user.id}/${Date.now()}-${fileToUpload.name}`;
      const { error: uploadError } = await supabase.storage.from("proposals").upload(storagePath, fileToUpload);
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase.from("proposals").insert({
        user_id: user.id,
        judul: judulSkripsi,
        bidang: bidangSkripsi,
        file_path: storagePath,
        status: "Menunggu Persetujuan Dosbing",
        is_locked: true, // Lock otomatis saat simpan
      }).select().single();

      if (insertError) throw insertError;

      // 1. Dapatkan ID Kaprodi secara dinamis
const { data: kaprodi } = await supabase
  .from('profiles')
  .select('id')
  .eq('role', 'kaprodi')
  .maybeSingle();

// 2. Kirim notifikasi jika Kaprodi ditemukan
if (kaprodi) {
  const receiverId = kaprodi.id;

  const { data: { user } } = await supabase.auth.getUser();

  const mhsNama =
    user?.user_metadata?.full_name ||
    user?.email ||
    "Seorang mahasiswa";

  await sendNotification(
    receiverId,
    "Usulan Judul Baru",
    `${mhsNama} telah mengajukan judul proposal baru: "${judulSkripsi}".`
  );
}



      setProposal({ ...proposal, storagePath, id: data.id, status: data.status, is_locked: true });
      alert("✅ Proposal berhasil disimpan dan dikunci!");
    } catch (error: any) {
      alert(`❌ Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAjukanDosen = async () => {
    if (!proposal?.id) return alert("Submit proposal terlebih dahulu");
    if (!pembimbing1) return alert("Pilih minimal Pembimbing 1");
    if (pembimbing1 === pembimbing2) return alert("Pembimbing 1 dan 2 tidak boleh sama");

    try {
      setLoading(true);
      await supabase.from("proposal_recommendations").delete().eq("proposal_id", proposal.id);
      const inserts = [{ proposal_id: proposal.id, dosen_id: pembimbing1, tipe: "pembimbing1" }];
      if (pembimbing2) inserts.push({ proposal_id: proposal.id, dosen_id: pembimbing2, tipe: "pembimbing2" });
      
      const { error } = await supabase.from("proposal_recommendations").insert(inserts);
      if (error) throw error;
      alert("✅ Pengajuan dosen pembimbing berhasil dikirim!");
      setIsDosenSubmitted(true);
    } catch (error: any) {
      alert("❌ Gagal mengajukan dosen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus proposal ini?")) return;
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user || !proposal?.id) return;

      if (proposal.storagePath) {
        await supabase.storage.from("proposals").remove([proposal.storagePath]);
      }
      
      await supabase.from("proposals").delete().eq("id", proposal.id).eq("user_id", user.id);
      if (proposal.url) URL.revokeObjectURL(proposal.url);

      setProposal(null);
      setPreviewUrl(null);
      setFileToUpload(null);
      setJudulSkripsi("");
      setPembimbing1("");
      setPembimbing2("");
      setIsDosenSubmitted(false);
      alert("🗑️ Proposal berhasil dihapus");
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans flex text-slate-700">
      <Sidebar />
      <main className="flex-1 ml-64 transition-all duration-300">
       <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
                 <div className="flex items-center gap-6">
                   <div className="relative w-72 group">
                   </div>
                 </div>
       
               <div className="flex items-center gap-6">
           {/* KOMPONEN LONCENG BARU */}
           <NotificationBell />
           
           <div className="h-8 w-[1px] bg-slate-200 mx-2" />
       
                 <div className="flex items-center gap-6">
                   {/* Minimalist SIMPRO Text */}
                   <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                     Simpro
                   </span>
                 </div>
                 </div>
               </header>

        <div className="p-10 max-w-[1400px] mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Unggah Proposal Skripsi</h1>
            <p className="text-slate-500 mt-2 font-medium">Lengkapi dokumen dan ajukan pembimbing untuk memulai skripsi Anda.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-8">
              {/* LOCK ALERT */}
              {proposal?.is_locked && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in duration-500">
                  <Lock size={18} />
                  <p className="text-xs font-bold uppercase tracking-tight">Dokumen dan data skripsi telah dikunci untuk proses review.</p>
                </div>
              )}

              <div className={`relative group transition-all ${isUploaded ? 'h-auto' : 'h-[400px]'}`}>
                <div className={`h-full bg-white p-12 rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center
                  ${isUploaded ? 'border-blue-100 bg-blue-50/20' : 'border-slate-300 hover:border-blue-400 hover:bg-white'}
                  ${proposal?.is_locked ? 'opacity-80' : ''}`}>
                  
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
                    className={`px-10 py-3.5 rounded-2xl font-bold shadow-lg transition active:scale-95 flex items-center gap-2 
                    ${proposal?.is_locked 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'}`}
                  >
                    {isUploaded ? (proposal?.is_locked ? "Dokumen Terkunci" : "Ganti File") : "Pilih Dokumen"}
                    {!proposal?.is_locked && (
                      <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files && handleSelectFile(e.target.files[0])} />
                    )}
                  </label>
                </div>
              </div>

              {isUploaded && proposal && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Status Dokumen</p>
                        <p className="text-xs text-slate-500 font-medium">{proposal.id ? "Sudah tersimpan di server" : "Draft (Belum disimpan)"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {!proposal.id && (
                        <button onClick={handleSubmit} disabled={loading} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-95">
                          {loading ? "Menyimpan..." : "SUBMIT SEKARANG"}
                        </button>
                      )}
                      {!proposal.is_locked && (
                        <button onClick={handleDelete} disabled={loading} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition active:scale-95">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <FileText className="text-blue-500" size={18} />
                          <span className="text-sm font-bold text-slate-700">{proposal.name}</span>
                       </div>
                    </div>
                    {previewUrl ? (
                      <iframe src={previewUrl} className="w-full h-[700px] border-none" />
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-slate-400 italic text-sm">Pratinjau tidak tersedia</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-8">
              {isUploaded && proposal && (
                <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                  <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Info size={20} className="text-blue-500" />
                    Detail Dokumen
                  </h2>
                  <div className="space-y-5">
                    <DetailCard label="File" value={proposal.name} />
                    <DetailCard label="Tanggal" value={proposal.uploadedAt} />
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Verifikasi</p>
                       <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider
                        ${proposal.id ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {proposal.status}
                       </span>
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <h2 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-tighter">
                  <UserCheck size={22} className="text-blue-600" />
                  Pembimbing
                </h2>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Judul Skripsi</label>
                    <textarea
                      value={judulSkripsi}
                      onChange={(e) => setJudulSkripsi(e.target.value)}
                      disabled={proposal?.is_locked}
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
                        disabled={proposal?.is_locked}
                        className="w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50/50 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none appearance-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {["AI", "Machine Learning", "Data Science", "Jaringan Komputer", "Internet of Things", "Cyber Security", "Rancang Bangun", "Lainnya"].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {!proposal?.is_locked && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors" size={18} />}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4"></div>

                  {[
                    { id: 'p1', label: 'Pembimbing Utama', state: pembimbing1, setState: setPembimbing1 },
                    { id: 'p2', label: 'Pembimbing Anggota', state: pembimbing2, setState: setPembimbing2 }
                  ].map((p) => (
                    <div key={p.id} className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{p.label}</label>
                      <div className="relative group">
                        <select
                          value={p.state}
                          onChange={(e) => p.setState(e.target.value)}
                          disabled={isDosenSubmitted || proposal?.is_locked}
                          className="w-full border border-slate-200 rounded-2xl p-4 text-sm bg-slate-50/50 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                        >
                          <option value="">-- Pilih Dosen --</option>
                          {listDosen.map((dosen) => (
                            <option key={dosen.id} value={dosen.id}>{dosen.nama}</option>
                          ))}
                        </select>
                        {(!isDosenSubmitted && !proposal?.is_locked) && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAjukanDosen}
                    disabled={!proposal?.id || loading || isDosenSubmitted}
                    className={`w-full py-4 rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl transition-all active:scale-95 mt-4
                      ${isDosenSubmitted 
                        ? "bg-green-100 text-green-600 shadow-none" 
                        : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"}`}
                  >
                    {isDosenSubmitted ? "Pengajuan Terkirim" : (loading ? "Memproses..." : "Ajukan Dosen Pembimbing")}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
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