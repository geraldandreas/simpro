"use client";

import { useState } from "react";
import useSWR from "swr"; 
import { useSearchParams, useRouter } from "next/navigation";
import { sendNotification } from "@/lib/notificationUtils";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { 
  AlertCircle, 
  User, 
  FileText, 
  ArrowLeft, 
  Trash2,
  CheckCircle,
  Lock,
  Download,
  Calendar,
  Clock,
  MessageSquare,
  ShieldCheck,
  ExternalLink
} from "lucide-react";

// ================= FETCHER SWR =================
const fetcher = async (sessionId: string) => {
  const { data: sessionData, error: sessionError } = await supabase
    .from("guidance_sessions")
    .select(`
      id, sesi_ke, tanggal, jam, keterangan, metode, status, dosen_id,
      proposal:proposals ( id, judul, user:profiles ( nama, npm, avatar_url ) )
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) throw new Error("Gagal load session");

  const proposalId = (sessionData.proposal as any).id;
  
  const { data: supervisors } = await supabase
    .from("thesis_supervisors")
    .select(`role, dosen_id, dosen:profiles ( nama, avatar_url )`)
    .eq("proposal_id", proposalId);

  const { data: sessionDrafts } = await supabase
    .from("session_drafts")
    .select(`id, file_url, uploaded_at, mahasiswa_id, catatan`)
    .eq("session_id", sessionId)
    .order("uploaded_at", { ascending: false });

  const { data: feedbackData, error: feedbackError } = await supabase
    .from("session_feedbacks")
    .select(`id, komentar, file_url, status_revisi, created_at, dosen:profiles ( nama )`)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (feedbackError) throw feedbackError;

  return {
    ...sessionData,
    proposal: { 
        ...(sessionData.proposal as any), 
        supervisors: supervisors || [] 
    },
    drafts: sessionDrafts || [],
    feedbacks: feedbackData || []
  };
};

export default function DetailBimbinganMahasiswaClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? `detail_bimbingan_${sessionId}` : null, 
    () => fetcher(sessionId as string),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, 
    }
  );

  const [file, setFile] = useState<File | null>(null);
  const [localCatatan, setLocalCatatan] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // --- HANDLERS ---
  const handleDownloadDraft = async (fileUrl: string) => {
    try {
      const path = fileUrl.split("draftsession/")[1];
      if (!path) throw new Error("Path invalid");

      const { data, error } = await supabase.storage
        .from("draftsession")
        .createSignedUrl(path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Gagal membuka draft");
    }
  };

  const handleDownloadFeedback = async (fileUrl: string) => {
    try {
      const path = fileUrl.split("feedback_draft/")[1];
      if (!path) throw new Error("Path file tidak valid");

      const { data, error } = await supabase.storage
        .from("feedback_draft")
        .createSignedUrl(path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file");
    }
  };

  const handleKirimKePembimbing = async () => {
    const confirmKirim = window.confirm("Kirim data ke pembimbing? Data tidak dapat diubah setelah dikirim.");
    if (!confirmKirim) return;

    setSending(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const userId = authSession?.user.id;
      if (!userId) throw new Error("User tidak terautentikasi.");

    if (file) {
        // 🔥 PERBAIKAN: Bersihkan nama file dari spasi dan karakter aneh
        const cleanFileName = file.name
          .replace(/\s+/g, "_") // Ganti semua spasi dengan underscore
          .replace(/[^a-zA-Z0-0._-]/g, ""); // Hapus karakter spesial selain titik, dash, underscore

        const filePath = `drafts/${sessionId}/${Date.now()}-${cleanFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("draftsession")
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("draftsession").getPublicUrl(filePath);
        const { error: insertError } = await supabase.from("session_drafts").insert({
          session_id: sessionId, 
          mahasiswa_id: userId, 
          file_url: urlData.publicUrl, 
          catatan: catatanAktif, 
        });
        if (insertError) throw insertError;
      }

      const targetDosenId = data?.dosen_id; 

      if (targetDosenId) {
        await sendNotification(
          targetDosenId, 
          "Draft Bimbingan Baru",
          `${data?.proposal?.user?.nama} telah mengunggah draft untuk Sesi Bimbingan ${data?.sesi_ke}.`
        );
      }

      alert("✅ Draft berhasil dikirim ke dosen terkait!");
      setFile(null); 
      mutate(); // Refresh SWR UI
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengirim: " + err.message);
    } finally {
      setSending(false);
    }
  };

 // --- EARLY RETURNS (DIBERSIHKAN DARI LAYOUT) ---
  // --- EARLY RETURNS (DIBERSIHKAN DARI LAYOUT) ---
  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] w-full p-10 outline-none focus:outline-none">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6 shadow-inner relative overflow-hidden">
            <AlertCircle size={32} className="relative z-10" />
          </div>
          <h2 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Sesi Tidak Ditemukan</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs mb-8">
            ID sesi tidak valid atau Anda tidak memiliki akses.
          </p>
          <button onClick={() => router.back()} className="group flex items-center gap-4 transition-all active:scale-95">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">Kembali ke Jadwal Bimbingan</span>
          </button>
        </div>
      </div>
    );
  }

   if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] z-50">
        {/* Animasi Spinner Simple & Elegan */}
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] w-full p-10 text-center font-black text-red-500 uppercase tracking-widest outline-none focus:outline-none">
        Gagal memuat data.
      </div>
    );
  }

  // --- DERIVED VARIABLES ---
  const student = data.proposal?.user || {};
  const supervisors = data.proposal?.supervisors || [];
  const p1Data = supervisors.find((s: any) => s.role === "utama" || s.role === "pembimbing1")?.dosen || {};
  const p2Data = supervisors.find((s: any) => s.role === "pendamping")?.dosen || {};
  const pembimbing1 = supervisors.find((s: any) => s.role === "utama")?.dosen?.nama || "-";
  const avatarP1 = p1Data.avatar_url || null;
  const pembimbing2 = supervisors.find((s: any) => s.role === "pendamping")?.dosen?.nama || "-";
  const avatarP2 = p2Data.avatar_url || null;
  
  const feedbacks = data.feedbacks || [];
  const feedbackWithFile = feedbacks.find((fb: any) => !!fb.file_url) ?? null;

  const catatanAktif = localCatatan !== null ? localCatatan : (data.drafts?.[0]?.catatan || "");
  const isLocked = data.drafts && data.drafts.length > 0 && data.drafts[0].file_url !== undefined;

  return (

        <div className=" p-10 pb-24 max-w-7xl mx-auto w-full">
          
          {/* HEADER CONTENT */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <button 
                onClick={() => router.back()}
                className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95"
              >
                {/* Kotak Putih Arrow */}
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                
                {/* Teks Label */}
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
                  Kembali ke Jadwal Bimbingan
                </span>
              </button>

              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
                  Sesi Bimbingan {data.sesi_ke}
                </h1>
                <p className="text-slate-500 font-medium">
                  Lengkapi progres bimbingan Anda di bawah ini.
                </p>
              </div>
            </div>

            {/* Badge Waktu */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
              <Calendar size={16} className="text-blue-500" />
              {new Date(data.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="mx-1 text-slate-300">|</span>
              <Clock size={16} className="text-blue-500" />
              {data.jam?.slice(0, 5)} WIB
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              
             <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03]"><User size={160} /></div>
                
                {/* 🔥 INFO MAHASISWA DENGAN AVATAR 🔥 */}
                <div className="relative flex items-start gap-6">
                  
                  {/* 🔥 PERBAIKAN UKURAN & BENTUK AVATAR 🔥 */}
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-md relative overflow-hidden text-slate-400 font-bold text-2xl">
                    {student.avatar_url ? (
                      <Image 
                        src={student.avatar_url} 
                        alt={student.nama || "Mahasiswa"} 
                        fill 
                        className="object-cover" 
                      />
                    ) : (
                      student.nama ? student.nama.charAt(0).toUpperCase() : <User size={32} />
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{student.nama}</h2>
                    <p className="text-blue-600 font-bold tracking-[0.15em] text-[10px] uppercase mt-1">{student.npm}</p>
                    <p className="mt-4 text-slate-600 font-semibold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                      "{data.proposal?.judul}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                   
                   {/* 🔥 INFO PEMBIMBING 1 DENGAN AVATAR 🔥 */}
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                        {avatarP1 ? (
                          <Image src={avatarP1} alt={pembimbing1} fill className="object-cover" />
                        ) : (
                          <ShieldCheck size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembimbing Utama</p>
                        <p className="text-sm font-bold text-slate-700">{pembimbing1}</p>
                      </div>
                   </div>

                   {/* 🔥 INFO PEMBIMBING 2 DENGAN AVATAR 🔥 */}
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                        {avatarP2 ? (
                          <Image src={avatarP2} alt={pembimbing2} fill className="object-cover" />
                        ) : (
                          <ShieldCheck size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Co-Pembimbing</p>
                        <p className="text-sm font-bold text-slate-700">{pembimbing2}</p>
                      </div>
                   </div>

                </div>
              </div>

              <div className={`bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-8 transition-all ${isLocked ? 'bg-slate-50/50 grayscale-[0.5]' : ''}`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><FileText size={20} /></div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Submit Draft Bimbingan</h3>
                  </div>
                  
                  {!isLocked ? (
                    <label className="bg-slate-900 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all shadow-lg active:scale-95 flex items-center gap-2">
                      PILIH FILE
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 px-5 py-2 bg-green-100 text-green-700 rounded-full border border-green-200">
                      <CheckCircle size={16} />
                      <span className="text-xs font-black uppercase tracking-widest">Terkirim</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  {file && !isLocked && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><FileText size={24} /></div>
                        <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Draft Terpilih</p>
                          <p className="text-sm font-bold text-slate-700 truncate max-w-md">{file.name}</p>
                        </div>
                      </div>
                      <button onClick={() => setFile(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  )}

                  {data.drafts && data.drafts.map((draft: any) => (
                    <div key={draft.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 group-hover:bg-blue-50 rounded-xl transition-colors text-slate-400 group-hover:text-blue-600"><FileText size={24} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 truncate max-w-md uppercase tracking-tight">
                            {draft.file_url.split("/").pop()}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Terunggah: {new Date(draft.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isLocked && (
                          <button
                            onClick={async () => {
                              if(!confirm("Hapus file ini?")) return;
                              await supabase.from("session_drafts").delete().eq("id", draft.id);
                              mutate(); 
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadDraft(draft.file_url)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink size={20} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!file && (!data.drafts || data.drafts.length === 0) && (
                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center bg-slate-50/50">
                      <FileText className="mx-auto text-slate-300 mb-4" size={40} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada draft bimbingan.</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-blue-500" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Catatan Mahasiswa</h4>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={catatanAktif}
                      onChange={(e) => setLocalCatatan(e.target.value)}
                      disabled={isLocked}
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none resize-none disabled:bg-white disabled:text-slate-400"
                      placeholder={isLocked ? "Catatan sudah terkirim..." : "Tuliskan apa saja yang sudah Anda kerjakan..."}
                    />
                    {isLocked && <div className="absolute top-4 right-4 text-slate-300"><Lock size={18} /></div>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-50">
                  <button onClick={() => router.back()} className="px-8 py-3 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">BATAL</button>
                  <button 
                    onClick={handleKirimKePembimbing}
                    disabled={sending || isLocked}
                    className={`px-10 py-3.5 text-white font-black rounded-2xl text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3 uppercase
                      ${isLocked 
                        ? "bg-slate-300 cursor-not-allowed shadow-none" 
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      }`}
                  >
                    {sending ? "MENGIRIM..." : isLocked ? "DATA TERKIRIM" : "KIRIM SEKARANG"}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              
              {/* KOMENTAR DOSEN */}
              <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
                
                {/* Header Komentar */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                      <MessageSquare size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Feedback Dosen</h3>
                </div>

                {feedbacks.length > 0 ? (
                    <div className="space-y-6">
                        {feedbacks.map((fb: any) => (
                        <div key={fb.id} className="relative pl-6 border-l-2 border-slate-100">
                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{fb.dosen?.nama}</p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${
                                fb.status_revisi === 'disetujui' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                {fb.status_revisi}
                                </span>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm mb-3">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {fb.komentar}
                                </p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter">
                                <Clock size={12} /> {new Date(fb.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 text-center">
                         <MessageSquare className="text-slate-300 mb-4" size={40} />
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                           Dosen pembimbing belum<br/>memberikan ulasan.
                         </p>
                    </div>
                )}
              </div>

             {/* FILE FEEDBACK */}
             <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
                
                {/* Header File Feedback yang disamakan dengan atas */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                      <FileText size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">File Feedback</h3>
                </div>
  
              {feedbackWithFile ? (
                <button
                    onClick={() => handleDownloadFeedback(feedbackWithFile.file_url)}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 group text-left overflow-hidden"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 shrink-0 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                      <FileText size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-900">
                        {decodeURIComponent(feedbackWithFile.file_url.split("/").pop()?.split("_").slice(1).join("_") || "File Pelengkap")}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 font-bold uppercase tracking-widest group-hover:text-blue-500">
                        Klik untuk mengunduh
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 p-2 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0">
                    <Download size={20} />
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 text-center">
                  <AlertCircle className="text-slate-300 mb-4" size={40} />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Dosen pembimbing belum mengunggah<br/>dokumen perbaikan.
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
  );
}