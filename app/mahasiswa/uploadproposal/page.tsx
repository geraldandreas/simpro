"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  CloudUpload,
  FileText,
  CheckCircle2,
  ChevronDown,
  Bell,
  Search,
} from "lucide-react";

// ---------------- TYPES ----------------

interface ProposalFile {
  name: string;
  url: string;           
  uploadedAt: string;
  status: string;
  storagePath?: string; 
  id?: string;           
}

interface Dosen {
  id: string;
  nama: string;
}

export default function UnggahProposal() {
  const [proposal, setProposal] = useState<ProposalFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State Form
  const [judulSkripsi, setJudulSkripsi] = useState("");
  const [bidangSkripsi, setBidangSkripsi] = useState("AI");
  const [listDosen, setListDosen] = useState<Dosen[]>([]);
  const [pembimbing1, setPembimbing1] = useState("");
  const [pembimbing2, setPembimbing2] = useState("");

  const isUploaded = !!proposal;

  // --- 1. Ambil data saat halaman dimuat (Persistensi & List Dosen) ---
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ambil Proposal yang sudah ada
      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (propData && !propError) {
        setProposal({
          name: propData.file_path.split("/").pop() || "Dokumen Proposal",
          url: "", 
          uploadedAt: new Date(propData.created_at).toLocaleDateString("id-ID"),
          status: propData.status,
          storagePath: propData.file_path,
          id: propData.id,
        });
        setJudulSkripsi(propData.judul);
        setBidangSkripsi(propData.bidang);
        
        const { data: signData } = await supabase.storage
          .from("proposals")
          .createSignedUrl(propData.file_path, 3600);
        
        if (signData) setPreviewUrl(signData.signedUrl);

        // Ambil rekomendasi dosen yang sudah pernah diajukan (Opsional: untuk auto-fill form)
        const { data: recData } = await supabase
          .from("proposal_recommendations")
          .select("dosen_id, tipe")
          .eq("proposal_id", propData.id);
        
        if (recData) {
          recData.forEach(rec => {
            if (rec.tipe === 'pembimbing_1') setPembimbing1(rec.dosen_id);
            if (rec.tipe === 'pembimbing_2') setPembimbing2(rec.dosen_id);
          });
        }
      }

      // Ambil Daftar Dosen dari tabel profiles
      const { data: dosenData } = await supabase
        .from("profiles")
        .select("id, nama")
        .eq("role", "dosen");

      if (dosenData) setListDosen(dosenData);
    }
    fetchData();
  }, []);

  // ---------------- HANDLERS ----------------

  const handleSelectFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileToUpload(file);
    setProposal({
      name: file.name,
      url,
      uploadedAt: new Date().toLocaleDateString("id-ID"),
      status: "Draft (Belum Submit)", 
    });
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!proposal || !fileToUpload) return;
    if (!judulSkripsi) return alert("Silakan isi judul skripsi");

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("User belum login");

      const storagePath = `${user.id}/${Date.now()}-${fileToUpload.name}`;
      const { error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(storagePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("proposals")
        .insert({
          user_id: user.id,
          judul: judulSkripsi,
          bidang: bidangSkripsi,
          file_path: storagePath,
          status: "Menunggu Persetujuan Dosbing",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProposal({ ...proposal, storagePath, id: data.id, status: data.status });
      alert("✅ Proposal berhasil disimpan!");
    } catch (error: any) {
      console.error(error);
      alert(`❌ Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAjukanDosen = async () => {
    if (!proposal?.id) return alert("Submit proposal terlebih dahulu");
    if (!pembimbing1) return alert("Pilih minimal Pembimbing 1");
    if (pembimbing1 === pembimbing2) return alert("Pembimbing 1 dan 2 tidak boleh dosen yang sama");

    try {
      setLoading(true);
      
      // Data untuk disimpan ke proposal_recommendations
      const inserts = [
        { proposal_id: proposal.id, dosen_id: pembimbing1, tipe: "pembimbing_1" }
      ];
      
      if (pembimbing2) {
        inserts.push({ proposal_id: proposal.id, dosen_id: pembimbing2, tipe: "pembimbing_2" });
      }

      // Hapus pengajuan lama jika ingin re-submit, atau langsung insert
      await supabase.from("proposal_recommendations").delete().eq("proposal_id", proposal.id);

      const { error } = await supabase.from("proposal_recommendations").insert(inserts);
      if (error) throw error;

      alert("✅ Pengajuan dosen pembimbing berhasil dikirim!");
    } catch (error: any) {
      console.error(error);
      alert("❌ Gagal mengajukan dosen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus proposal ini?")) return;
    try {
      setLoading(true);
      if (!proposal) return;
      if (proposal.storagePath) await supabase.storage.from("proposals").remove([proposal.storagePath]);
      if (proposal.id) await supabase.from("proposals").delete().eq("id", proposal.id);
      if (proposal.url) URL.revokeObjectURL(proposal.url);

      setProposal(null); setPreviewUrl(null); setFileToUpload(null); setJudulSkripsi("");
      alert("🗑️ Berhasil dihapus");
    } catch (error) {
      console.error(error);
      alert("❌ Gagal menghapus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans flex text-slate-700">
      <Sidebar />
      <main className="flex-1 ml-64 transition-all duration-300">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition"><Bell size={20} /></button>
        </header>

        <div className="p-8 max-w-[1200px] mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-800">Unggah Proposal Skripsi</h1>
            <p className="text-sm text-gray-400 mt-1">Unggah dokumen proposal Anda di sini.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                <div className="bg-[#5da8f5] p-6 rounded-full mb-6 shadow-sm"><CloudUpload size={48} className="text-white" /></div>
                <h2 className="text-lg font-bold text-gray-700">Drag & drop file disini, atau</h2>
                <label className="mt-4 bg-[#345d8a] text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-[#2a4a6e] transition cursor-pointer active:scale-95">
                  Pilih File
                  <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files && handleSelectFile(e.target.files[0])} />
                </label>
                {!isUploaded && <p className="mt-2 text-[11px] text-gray-400 italic">Belum ada proposal yang diunggah.</p>}
              </div>

              {isUploaded && proposal && (
                <div className="space-y-4">
                  {proposal.id && (
                    <div className="bg-[#e8f3f0] p-4 rounded-xl border border-[#d1e7e0] flex items-center gap-4">
                      <CheckCircle2 className="text-[#56a78a]" size={28} />
                      <div className="text-sm font-bold text-gray-800">Unggah Berhasil</div>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={24} />
                      <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px] md:max-w-md">{proposal.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!proposal.id && (
                        <button onClick={handleSubmit} disabled={loading} className="bg-[#345d8a] text-white px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95">
                          {loading ? "Menyimpan..." : "Submit Proposal"}
                        </button>
                      )}
                      <button onClick={handleDelete} disabled={loading} className="bg-[#e24c3d] text-white px-5 py-2 rounded-lg text-xs font-bold active:scale-95 transition">Hapus</button>
                    </div>
                  </div>
                  {previewUrl && <iframe src={previewUrl} className="w-full h-[600px] border rounded-xl shadow-inner" />}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {isUploaded && proposal && (
                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h2 className="text-md font-bold text-gray-800 mb-6 border-b pb-2">Detail Proposal</h2>
                  <div className="space-y-4">
                    <DetailItem label="Nama File" value={proposal.name} />
                    <DetailItem label="Tanggal Diunggah" value={proposal.uploadedAt} />
                    <div className="flex items-start text-[11px] font-bold">
                      <span className="w-28 text-gray-800 uppercase">Status</span>
                      <span className="text-gray-400 mr-2">:</span>
                      <span className={`px-3 py-1 rounded-full border text-[10px] ${proposal.id ? 'bg-[#f0f9f6] text-[#56a78a] border-[#d1e7e0]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {proposal.status}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-md font-bold text-gray-800 mb-2 font-bold uppercase tracking-tight">Ajukan Calon Dosen Pembimbing</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Judul Skripsi</label>
                    <input 
                      type="text" 
                      value={judulSkripsi}
                      onChange={(e) => setJudulSkripsi(e.target.value)}
                      placeholder="Masukkan judul..."
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-400 bg-gray-50/30" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Bidang Skripsi</label>
                    <div className="relative">
                        <select 
                          value={bidangSkripsi}
                          onChange={(e) => setBidangSkripsi(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-400 appearance-none pr-10 cursor-pointer text-gray-600" 
                        >
                            <option value="AI">AI</option>
                            <option value="Machine Learning">Machine Learning</option>
                            <option value="Data Science">Data Science</option>
                            <option value="Jaringan Komputer">Jaringan Komputer</option>
                            <option value="Internet of Things">Internet of Things</option>
                            <option value="Cyber Security">Cyber Security</option>
                            <option value="Rancang Bangun">Rancang Bangun</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Pembimbing 1</label>
                    <div className="relative">
                        <select 
                            value={pembimbing1}
                            onChange={(e) => setPembimbing1(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-400 appearance-none pr-10 cursor-pointer text-gray-600"
                        >
                            <option value="">-- Pilih Dosen --</option>
                            {listDosen.map((dosen) => (
                                <option key={dosen.id} value={dosen.id}>{dosen.nama}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Pembimbing 2</label>
                    <div className="relative">
                        <select 
                            value={pembimbing2}
                            onChange={(e) => setPembimbing2(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-400 appearance-none pr-10 cursor-pointer text-gray-600"
                        >
                            <option value="">-- Pilih Dosen --</option>
                            {listDosen.map((dosen) => (
                                <option key={dosen.id} value={dosen.id}>{dosen.nama}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <button 
                    onClick={handleAjukanDosen}
                    disabled={!proposal?.id || loading} 
                    className="w-full py-3 rounded-lg text-xs font-bold shadow-md bg-[#345d8a] text-white disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95 mt-4"
                  >
                    {loading ? "Memproses..." : "Ajukan Dosen Pembimbing"}
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start text-[11px] font-bold">
      <span className="w-28 text-gray-800 uppercase shrink-0 tracking-tight">{label}</span>
      <span className="text-gray-400 mr-2">:</span>
      <span className="flex-1 text-gray-700 leading-tight break-all font-medium">{value}</span>
    </div>
  );
}