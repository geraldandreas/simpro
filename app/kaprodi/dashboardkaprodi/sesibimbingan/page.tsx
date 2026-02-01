"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  ArrowLeft, Download, FileText, UploadCloud, 
  Save, User, AlertCircle, CheckCircle 
} from "lucide-react";

// --- TYPES ---
interface SessionFeedback {
  id: string;
  komentar: string;
  file_url: string | null;
  status_revisi: string;
  created_at: string;
  dosen: {
    id: string;
    nama: string;
  };
}


interface SessionDetail {
  id: string;
  sesi_ke: number;
  tanggal: string;
  jam: string;
  metode: string;
  hasil_bimbingan: string; 
  status: string; 
  kehadiran_mahasiswa: string; 
  
  proposal: {
    id: string; // Need proposal ID for seminar check
    judul: string;
    mahasiswa: {
      nama: string;
      npm: string;
    };
  };
  dosen: {
    nama: string;
  };
  drafts?: {
      id: string;
      file_url: string;
      uploaded_at: string;
      catatan: string | null;
  }[];
}

export default function SesiBimbinganPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  const [session, setSession] = useState<SessionDetail | null> (null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSeminarApproved, setIsSeminarApproved] = useState(false); // New State
  
  // Form States
  const [komentar, setKomentar] = useState("");
  const [kehadiran, setKehadiran] = useState<string | null>(null);
  const [statusSesi, setStatusSesi] = useState<string | null>(null);       // guidance_sessions.status
  const [statusRevisi, setStatusRevisi] = useState<string | null>(null);   // session_feedbacks.status_revisi
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [namaBersihURL, setNamaBersih] = useState<string | null>(null);



  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileBalasan, setFileBalasan] = useState<File | null>(null);
  

  useEffect(() => {
    if (sessionId) fetchData();
  }, [sessionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Session Data
      const { data: sessionData, error } = await supabase
  .from("guidance_sessions")
  .select(`
    *,
    proposal:proposals (
      id,
      judul,
      mahasiswa:profiles (
        nama,
        npm
      )
    ),
    dosen:profiles!guidance_sessions_dosen_id_fkey (
      nama
    ),
    drafts:session_drafts (
      id,
      file_url,
      uploaded_at,
      catatan
    )
  `)
  .eq("id", sessionId)
  .single();

      if (error) throw error;

      setSession(sessionData); 
      setKehadiran(sessionData.kehadiran_mahasiswa || null);
      setStatusSesi(sessionData.status);

      // 3️⃣ Fetch feedback dosen
const { data: feedbackData, error: feedbackError } = await supabase
  .from("session_feedbacks")
  .select(`
    id,
    komentar,
    file_url,
    status_revisi,
    created_at,
    dosen:profiles (
      id,
      nama
    )
  `)
  .eq("session_id", sessionId)
  .order("created_at", { ascending: false });

if (feedbackError) throw feedbackError;

   const latestFeedback = feedbackData?.[0] ?? null;
 

setFeedbackId(latestFeedback?.id ?? null);
setKomentar(latestFeedback?.komentar ?? "");
setStatusRevisi(latestFeedback?.status_revisi ?? null);
setExistingFileUrl(latestFeedback?.file_url ?? null);




      // 2. Check Seminar Status (Is already approved?)
      if (sessionData.proposal?.id) {
        const { data: seminarReq } = await supabase
          .from('seminar_requests')
          .select('status')
          .eq('proposal_id', sessionData.proposal.id)
          .eq('status', 'Disetujui') 
          .maybeSingle();
        
        if (seminarReq) setIsSeminarApproved(true);
        
      }

    } catch (err) {
      console.error("Error fetching session:", err);
    } finally {
      setLoading(false);
    }
  };



  // --- ACTIONS ---

  const handleDownloadDraft = async (fileUrl: string) => {
  try {
    // ambil path SETELAH nama bucket
    const path = fileUrl.split("/draftsession/")[1];

    if (!path) throw new Error("Path file tidak valid");

    const { data, error } = await supabase.storage
      .from("draftsession")
      .createSignedUrl(path, 3600);

    if (error) throw error;

    window.open(data.signedUrl, "_blank");
  } catch (err) {
    console.error(err);
    alert("Gagal mengunduh file");
  }
};

  const handleDownloadFeedback = async (fileUrl: string) => {
  try {
   
    // ambil path SETELAH nama bucket
    const path = fileUrl.split("feedback_draft/")[1];
  

    if (!path) throw new Error("Path file tidak valid");

    const { data, error } = await supabase.storage
      .from("feedback_draft")
      .createSignedUrl(path, 3600);
    console.log("data",data)
    if (error) throw error;

    window.open(data.signedUrl, "_blank");
    console.log("datasigned",data.signedUrl)
  } catch (err) {
    console.error(err);
    alert("Gagal mengunduh file");
  }
};

 const handleSave = async () => {
  if (!sessionId) return;

  if (!kehadiran) {
    alert("❗ Tentukan kehadiran mahasiswa terlebih dahulu");
    return;
  }

  if (!statusRevisi) {
    alert("❗ Tentukan status bimbingan Mahasiswa (selesai / revisi)");
    return;
  }

  setSaving(true);

  try {
    let fileUrl: string | null = null;


    // 1️⃣ Upload file balasan (jika ada)
    if (fileBalasan) {
      const filePath = `${sessionId}/${Date.now()}_${fileBalasan.name}`;

      const { error: uploadError } = await supabase.storage
        .from("feedback_draft")
        .upload(filePath, fileBalasan);

      if (uploadError) throw uploadError;

      fileUrl = `feedback_draft/${filePath}`;
    }

    if (feedbackId) {
  // UPDATE (edit feedback lama)
  await supabase
    .from("session_feedbacks")
    .update({
      komentar,
      file_url: fileUrl,
      status_revisi: statusRevisi,
    })
    .eq("id", feedbackId);
} else {
  // INSERT (feedback pertama)
  await supabase
    .from("session_feedbacks")
    .insert({
      session_id: sessionId,
      dosen_id: (await supabase.auth.getUser()).data.user?.id,
      komentar,
      file_url: fileUrl,
      status_revisi: statusRevisi,
    });
}
  
    
    setFileBalasan(null);
    await fetchData();

    const { error: sessionError } = await supabase
      .from("guidance_sessions")
      .update({
        status: statusSesi,                // selesai 
        kehadiran_mahasiswa: kehadiran,          // hadir / tidak_hadir
      })
      .eq("id", sessionId);

    if (sessionError) throw sessionError;

   alert("✅ Feedback berhasil disimpan");
    router.refresh();

  } catch (err: any) {
    console.error(err);
    alert("❌ Gagal menyimpan feedback");
  } finally {
    setSaving(false);
  }
};


 const handleAccSeminar = async () => {
  if (!session?.proposal?.id) return;

  if (!confirm("Apakah Anda yakin ingin meng-ACC mahasiswa ini untuk Seminar?"))
    return;

  try {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User tidak login");

    // 1️⃣ Cek role dosen
    const { data: supervisor } = await supabase
      .from("thesis_supervisors")
      .select("role")
      .eq("proposal_id", session.proposal.id)
      .eq("dosen_id", user.id)
      .single();

    if (!supervisor) {
      throw new Error("Anda bukan pembimbing mahasiswa ini");
    }

    const role = supervisor.role;

    // 2️⃣ Cek seminar request
    const { data: existing } = await supabase
      .from("seminar_requests")
      .select("id")
      .eq("proposal_id", session.proposal.id)
      .maybeSingle();

    let seminarRequestId: string;

    // 3️⃣ INSERT JIKA BELUM ADA
    if (!existing) {
      const { data: inserted, error } = await supabase
        .from("seminar_requests")
        .insert({
          proposal_id: session.proposal.id,
          tipe: "seminar",
          status: "Menunggu Persetujuan",
          approved_by_p1: role === "utama" || role === "pembimbing1",
          approved_by_p2: role === "pendamping",
        })
        .select("id")
        .single();

      if (error) throw error;
      seminarRequestId = inserted.id;

    } else {
      seminarRequestId = existing.id;

      const { error } = await supabase
        .from("seminar_requests")
        .update(
          role === "utama" || role === "pembimbing1"
            ? { approved_by_p1: true }
            : { approved_by_p2: true }
        )
        .eq("id", seminarRequestId);

      if (error) throw error;
    }

    // 4️⃣ CEK APAKAH SUDAH DI-ACC KEDUANYA
    const { data: updated } = await supabase
      .from("seminar_requests")
      .select("approved_by_p1, approved_by_p2")
      .eq("id", seminarRequestId)
      .single();

    if (updated?.approved_by_p1 && updated?.approved_by_p2) {
      await supabase
        .from("seminar_requests")
        .update({ status: "Disetujui" })
        .eq("id", seminarRequestId);
    }

    alert("✅ ACC Seminar berhasil dicatat");

  } catch (err: any) {
    console.error(err);
    alert("❌ Gagal ACC Seminar: " + err.message);
  } finally {
    setSaving(false);
  }
};





  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Memuat sesi...</div>;
  if (!session) return <div className="flex h-screen items-center justify-center text-gray-400">Sesi tidak ditemukan.</div>;
  const draft = session.drafts?.[0] ?? null;

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      {/* Sidebar dihapus karena sudah ada di layout.tsx */}

      <main className="flex-1 p-8 flex flex-col h-screen overflow-y-auto">
        
        {/* Header Nav */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2 transition">
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">Kembali</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Sesi Bimbingan {session.sesi_ke}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI (DETAIL UTAMA) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Info Mahasiswa */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-start gap-5">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
                {session.proposal.mahasiswa.nama.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{session.proposal.mahasiswa.nama}</h2>
                <p className="text-sm text-gray-500 font-medium mb-2">{session.proposal.mahasiswa.npm}</p>
                <p className="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {session.proposal.judul}
                </p>
                
                <div className="mt-4 flex gap-6 text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-500"/>
                    Pembimbing: {session.dosen.nama}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Dokumen & Catatan Mahasiswa */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dokumen Mahasiswa</h3>
              
              {draft ? (
  <div className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
        <FileText size={24} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">
          {draft.file_url.split("/").pop()}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Diunggah:{" "}
          {new Date(draft.uploaded_at).toLocaleDateString("id-ID")}
        </p>
      </div>
    </div>
     <button
  onClick={() => handleDownloadDraft(draft.file_url)}
  className="bg-[#365b8e] hover:bg-[#2a466f] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-2"
>
  <Download size={16} /> Unduh
</button>

  </div>
) : (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-6 text-gray-400">
    <AlertCircle size={24} className="mb-2 opacity-50" />
    <p className="text-sm font-medium">
      Mahasiswa belum mengunggah dokumen draft.
    </p>
  </div>
)}


              <div className="mb-6">
                <label className="text-sm font-bold text-gray-700 block mb-2">Catatan dari Mahasiswa</label>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 min-h-[80px]">
                  {session.drafts?.[0]?.catatan || "-"}
                 
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-bold text-gray-900 mb-3">Keputusan Sesi Ini</p>
                <div className="flex items-center gap-6">
                  <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${statusSesi === 'selesai' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={statusRevisi === 'disetujui'}
                      onChange={() => setStatusRevisi('disetujui')}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className={`text-sm font-bold ${statusRevisi === 'disetujui' ? 'text-green-700' : 'text-gray-600'}`}>
                      ACC Draft
                    </span>
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${statusRevisi === 'revisi' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={statusRevisi === 'revisi'}
                      onChange={() => setStatusRevisi('revisi')}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-400 border-gray-300"
                    />
                    <span className={`text-sm font-bold ${statusRevisi === 'perlu_revisi' ? 'text-orange-700' : 'text-gray-600'}`}>
                      Perlu Revisi
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-3">Kehadiran Mahasiswa</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setKehadiran('hadir')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold border transition ${kehadiran === 'hadir' ? 'bg-[#588d7f] text-white border-[#588d7f] shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Hadir
                  </button>
                  <button 
                    onClick={() => setKehadiran('tidak_hadir')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold border transition ${kehadiran === 'tidak_hadir' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Tidak Hadir
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* KOLOM KANAN (FEEDBACK & ACC SEMINAR) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* === NEW: ACC SEMINAR BUTTON (CONDITIONAL) === */}
            {session.sesi_ke >= 10 && !isSeminarApproved && (
              <div className="bg-[#eff6ff] rounded-2xl border border-blue-200 p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">Kelayakan Seminar</h3>
                    <p className="text-xs text-blue-700 mt-1">
                      Mahasiswa ini telah mencapai sesi ke-{session.sesi_ke}. Jika dirasa sudah layak, Anda dapat memberikan persetujuan seminar sekarang.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAccSeminar}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all active:scale-95 disabled:opacity-70"
                >
                  {saving ? "Memproses..." : "ACC Seminar"}
                </button>
              </div>
            )}

            {/* === ALREADY APPROVED INFO === */}
            {isSeminarApproved && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6 shadow-sm flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <h3 className="text-sm font-bold text-green-900">Seminar Disetujui</h3>
                  <p className="text-xs text-green-700">Mahasiswa sudah di-ACC untuk seminar.</p>
                </div>
              </div>
            )}

           {/* File Upload Balasan & Display */}
<div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
  <h3 className="text-sm font-bold text-gray-900 mb-4">File Balasan Dosen</h3>
  
 
 {/* 1. TAMPILAN FILE YANG SUDAH TERUPLOAD DI DATABASE */}
{existingFileUrl && (
  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 shadow-sm">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
        <FileText size={20} />
      </div>
      <div className="overflow-hidden">
        <p className="text-xs font-bold text-blue-900 truncate">
          {decodeURIComponent(existingFileUrl?.split("/").pop()?.split("_").slice(1).join("_") || "File Pelengkap")}
        </p>
        <p className="text-[10px] text-blue-600 font-medium">File telah dikirim</p>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleDownloadFeedback(existingFileUrl)}
        className="text-blue-700 hover:text-blue-900 p-2 transition"
        title="Unduh File"
      >
        <Download size={18} />
      </button>
      
      
    </div>
  </div>
)}

{/* 2. AREA UNGGAH FILE (Hanya muncul jika BELUM ada file di database) */}
{!existingFileUrl && (
  <div className="space-y-3">
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
        fileBalasan 
          ? "border-green-300 bg-green-50" 
          : "border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className={`p-3 rounded-full mb-3 group-hover:scale-110 transition-transform ${
        fileBalasan ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-500"
      }`}>
        <UploadCloud size={24} />
      </div>
      <p className="text-xs font-bold text-gray-700 mb-1">
        {fileBalasan ? fileBalasan.name : "Klik untuk upload file balasan"}
      </p>
      <p className="text-[10px] text-gray-400">
        {fileBalasan ? "File siap diunggah" : "PDF / DOCX (Max 5MB)"}
      </p>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => setFileBalasan(e.target.files?.[0] || null)} 
      />
    </div>

    {/* Tombol Batal jika baru sekedar memilih file di komputer (belum save ke DB) */}
    {fileBalasan && (
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          setFileBalasan(null); 
        }} 
        className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg transition"
      >
        Batalkan Pilihan
      </button>
    )}
  </div>
)}

  {/* TOMBOL BATALKAN UPLOAD BARU */}
  {fileBalasan && (
    <button 
      onClick={(e) => { 
        e.stopPropagation(); 
        setFileBalasan(null); 
      }} 
      className="mt-3 w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg transition"
    >
      Batalkan Perubahan File
    </button>
  )}
</div>
                
            {/* Komentar Dosen */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User size={16} className="text-gray-500"/>
                </div>
                <p className="text-sm font-bold text-gray-800">{session.dosen.nama}</p>
              </div>
              
              <textarea
                value={komentar}
                onChange={(e) => setKomentar(e.target.value)}
                placeholder="Tuliskan komentar, masukan, atau revisi untuk mahasiswa..."
                className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-h-[200px] resize-none transition"
              />

              <button 
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full bg-[#3b608a] hover:bg-[#2a466f] text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? "Menyimpan..." : <><Save size={18} /> Simpan Hasil Bimbingan</>}
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
