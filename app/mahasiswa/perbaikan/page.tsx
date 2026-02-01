"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  CloudUpload,
  FileText,
  Bell,
  Trash2,
  Info,
  ShieldCheck,
  ArrowRight,
  History
} from "lucide-react";

/* ================= UTIL ================= */
const formatTanggal = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function PerbaikanPascaSeminar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [revision, setRevision] = useState<any>(null);
  const [sidang, setSidang] = useState<any>(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: proposal } = await supabase
        .from("proposals")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

        if (!proposal) return;

      const { data: seminar } = await supabase
        .from("seminar_requests")
        .select("id")
        .eq("proposal_id", proposal?.id)
        .eq("tipe", "seminar")
        .maybeSingle();

      const { data: revisionData } = await supabase
        .from("seminar_revisions")
        .select("*")
        .eq("seminar_request_id", seminar?.id)
        .maybeSingle();

      const { data: sidangData } = await supabase
        .from("sidang_requests")
        .select("*")
        .eq("proposal_id", proposal?.id)
        .maybeSingle();

      setRevision(revisionData ?? null);
      setSidang(sidangData ?? null);
    } catch (err) {
      console.error("Fetch gagal:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPLOAD ================= */
  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: proposal } = await supabase
        .from("proposals")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const { data: seminar } = await supabase
        .from("seminar_requests")
        .select("id")
        .eq("proposal_id", proposal?.id)
        .eq("tipe", "seminar")
        .maybeSingle();

      const filePath = `${seminar?.id}/${Date.now()}-${file.name}`;

      const { error: storageError } = await supabase.storage
        .from("seminar_perbaikan")
        .upload(filePath, file, { upsert: true });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("seminar_revisions")
        .upsert(
          {
            seminar_request_id: seminar?.id,
            file_path: filePath,
            original_name: file.name,
          },
          { onConflict: "seminar_request_id" }
        );

      if (dbError) throw dbError;
      await fetchAll();
    } catch (err) {
      alert("Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!revision) return;
    if (!confirm("Yakin ingin menghapus file perbaikan?")) return;

    try {
      setUploading(true);
      await supabase.storage.from("seminar_perbaikan").remove([revision.file_path]);
      await supabase.from("seminar_revisions").delete().eq("seminar_request_id", revision.seminar_request_id);
      setRevision(null);
    } catch (err) {
      alert("Gagal menghapus file");
    } finally {
      setUploading(false);
    }
  };

  /* ================= AJUKAN SIDANG ================= */
  const handleAjukanSidang = async () => {
    if (!revision) return;
    if (!confirm("Ajukan sidang skripsi sekarang?")) return;

    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: proposal } = await supabase.from("proposals").select("id").eq("user_id", session.user.id).maybeSingle();
      const { data: seminar } = await supabase.from("seminar_requests").select("id").eq("proposal_id", proposal?.id).eq("tipe", "seminar").maybeSingle();

      const { error } = await supabase.from("sidang_requests").insert({
        proposal_id: proposal?.id,
        seminar_request_id: seminar?.id,
        seminar_revision_id: revision.id,
        status: "menunggu_penjadwalan",
      });

      if (error) {
        if (error.code === "23505") return alert("Sidang sudah pernah diajukan.");
        throw error;
      }

      alert("✅ Sidang berhasil diajukan! Menunggu jadwal Kaprodi.");
      await fetchAll();
    } catch (err) {
      alert("Gagal mengajukan sidang.");
    } finally {
      setUploading(false);
    }
  };

  const bolehAjukanSidang = !!revision && !sidang;

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
        {/* HEADER */}
         <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group">
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Minimalist SIMPRO Text */}
            <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
              Simpro
            </span>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Perbaikan Pasca Seminar</h1>
            <p className="text-slate-500 font-medium mt-1">Selesaikan revisi seminar hasil untuk melangkah ke tahap Sidang Skripsi Akhir.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT AREA: UPLOAD & FILE LIST */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* UPLOAD ZONE */}
              <div 
                onClick={() => !sidang && fileInputRef.current?.click()}
                className={`group relative h-[320px] bg-white p-12 rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center
                  ${sidang ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer border-slate-300 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50'}`}
              >
                <div className={`p-6 rounded-3xl mb-6 shadow-xl transition-all group-hover:scale-110 
                  ${sidang ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                  <CloudUpload size={40} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  {sidang ? "Akses Unggah Ditutup" : "Tarik & Lepas file perbaikan di sini"}
                </h2>
                <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                  {sidang ? "Anda tidak dapat mengubah file setelah mengajukan sidang." : "Pastikan dokumen dalam format PDF dan sudah disetujui dosen penguji."}
                </p>
                {!sidang && (
                  <button className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    Pilih Berkas PDF
                  </button>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files && handleUpload(e.target.files[0])} />

              {/* UPLOADED FILE STATUS */}
              {revision && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <p className="font-black text-emerald-900 uppercase tracking-tight text-sm">Dokumen Terdeteksi</p>
                      <p className="text-xs text-emerald-700 font-medium opacity-80">Berkas perbaikan Anda sudah tersimpan dengan aman di server.</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex justify-between items-center group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-red-500 shrink-0 border border-slate-100 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{revision.original_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Final Draft Perbaikan</p>
                      </div>
                    </div>

                    {!sidang && (
                      <button
                        onClick={handleDelete}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT AREA: DETAILS & ACTIONS */}
            <div className="lg:col-span-4 space-y-8">
              <section className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Info size={80} />
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Info size={20} className="text-blue-600" /> Detail Arsip
                </h2>
                <div className="space-y-6">
                  <DetailItem label="Nama Berkas" value={revision?.original_name || "-"} />
                  <DetailItem label="Waktu Unggah" value={formatTanggal(revision?.created_at)} />
                  <div className="h-px bg-slate-50 my-2" />
                  <div className="flex flex-col gap-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kelengkapan</p>
                     <span className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider w-fit
                        ${revision ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {revision ? "Siap Diajukan" : "Menunggu Berkas"}
                     </span>
                  </div>
                </div>
              </section>

              <button
                disabled={!bolehAjukanSidang || uploading}
                onClick={handleAjukanSidang}
                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                  ${bolehAjukanSidang
                    ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                    : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                }`}
              >
                {sidang ? <ShieldCheck size={18} /> : <ArrowRight size={18} />}
                {sidang ? "Sidang Terjadwal" : "Ajukan Sidang Akhir"}
              </button>

              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex gap-4">
                 <History className="text-indigo-400 shrink-0" size={20} />
                 <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">
                   Pastikan semua catatan revisi dari penguji seminar telah diperbaiki sepenuhnya sebelum menekan tombol ajukan.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</p>
      <p className="text-sm font-bold text-slate-700 leading-tight break-all uppercase tracking-tight">{value}</p>
    </div>
  );
}