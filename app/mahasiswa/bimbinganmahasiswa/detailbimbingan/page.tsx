"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/sidebar";
import { 
  Search, 
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

export default function DetailBimbinganPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [catatanInput, setCatatanInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const { data: sessionData, error: sessionError } = await supabase
          .from("guidance_sessions")
          .select(`
            id, sesi_ke, tanggal, jam, keterangan, metode, status,
            proposal:proposals ( id, judul, user:profiles ( nama, npm ) )
          `)
          .eq("id", sessionId)
          .single();

        if (sessionError) throw sessionError;

        const { data: supervisors } = await supabase
          .from("thesis_supervisors")
          .select(`role, dosen:profiles ( nama )`)
          .eq("proposal_id", sessionData.proposal.id);


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
          console.log("fileURL", feedbackData?.[0]?.file_url)

        if (feedbackError) throw feedbackError;
        setFeedbacks(feedbackData || []);

        setData({
          ...sessionData,
          proposal: { ...sessionData.proposal, supervisors: supervisors || [] },
          drafts: sessionDrafts || [],
        });
        
        setCatatanInput(sessionDrafts?.[0]?.catatan || "");
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [sessionId]);

  const isLocked = data?.drafts[0]?.file_url !== undefined;

  const handleKirimKePembimbing = async () => {
    if (isLocked) return;
    if (!sessionId) return;
    if (!file && (!data.drafts || data.drafts.length === 0) && !catatanInput) {
      alert("Mohon unggah file atau isi catatan sebelum mengirim.");
      return;
    }

    const confirmKirim = window.confirm("Kirim data ke pembimbing? Data tidak dapat diubah setelah dikirim.");
    if (!confirmKirim) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) throw new Error("User tidak terautentikasi.");

      if (file) {
        const filePath = `drafts/${sessionId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("draftsession").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("draftsession").getPublicUrl(filePath);
        const { error: insertError } = await supabase.from("session_drafts").insert({
          session_id: sessionId, mahasiswa_id: userId, file_url: urlData.publicUrl, catatan: catatanInput,
        });
        if (insertError) throw insertError;
      }

      alert("✅ Draft dan catatan berhasil dikirim ke pembimbing!");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengirim: " + err.message);
    } finally {
      setSending(false);
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


  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FB]">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  const supervisors = data?.proposal?.supervisors || [];
  const pembimbing1 = supervisors.find((s: any) => s.role === "utama")?.dosen?.nama || "-";
  const pembimbing2 = supervisors.find((s: any) => s.role === "pendamping")?.dosen?.nama || "-";
  if (!sessionId) return <div className="flex h-screen items-center justify-center text-gray-400">Sesi tidak ditemukan.</div>;
  const feedback= feedbacks?.[0] ?? null;

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
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

        <div className="flex-1 p-10 pb-24 max-w-7xl mx-auto w-full">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-11 h-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-600 tracking-tight uppercase">Sesi Bimbingan {data?.sesi_ke}</h1>
                <p className="text-slate-500 text-sm font-medium">Lengkapi progres bimbingan Anda di bawah ini.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
                <Calendar size={16} className="text-blue-500" />
                {new Date(data?.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="mx-1 text-slate-300">|</span>
                <Clock size={16} className="text-blue-500" />
                {data?.jam?.slice(0, 5)} WIB
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* SISI KIRI (8 KOLOM) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* KARTU PROFIL MAHASISWA */}
              <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                    <User size={160} />
                </div>
                <div className="relative flex items-start gap-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center shrink-0 border-2 border-white shadow-inner">
                    <User size={48} className="text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{data?.proposal?.user?.nama}</h2>
                    <p className="text-blue-600 font-bold tracking-[0.15em] text-xs uppercase mt-1">{data?.proposal?.user?.npm}</p>
                    <p className="mt-4 text-slate-600 font-semibold leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      "{data?.proposal?.judul}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck size={18} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembimbing Utama</p>
                        <p className="text-sm font-bold text-slate-700">{pembimbing1}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><ShieldCheck size={18} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembimbing Pendamping</p>
                        <p className="text-sm font-bold text-slate-700">{pembimbing2}</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* UNGGAH DOKUMEN & CATATAN */}
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

                  {data?.drafts && data.drafts.map((draft: any) => (
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
                      <div className="flex gap-2">
                        {!isLocked && (
                          <button onClick={async () => {
                            if(!confirm("Hapus file ini?")) return;
                            await supabase.from("session_drafts").delete().eq("id", draft.id);
                            window.location.reload();
                          }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                        )}
                        <a href={draft.file_url} target="_blank" className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><ExternalLink size={20} /></a>
                      </div>
                    </div>
                  ))}

                  {!file && (!data?.drafts || data.drafts.length === 0) && (
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
                      value={catatanInput}
                      onChange={(e) => setCatatanInput(e.target.value)}
                      disabled={isLocked}
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none resize-none disabled:bg-white disabled:text-slate-400"
                      placeholder={isLocked ? "Catatan sudah terkirim..." : "Tuliskan apa saja yang sudah kamu kerjakan..."}
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

            {/* SISI KANAN (4 KOLOM) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* KOMENTAR DOSEN */}
              <div className="bg-white rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><MessageSquare size={18} /></div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Feedback Dosen</h3>
                </div>

                {feedbacks.length > 0 ? (
                    <div className="space-y-6">
                        {feedbacks.map((fb) => (
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
                    <div className="py-12 text-center">
                         <Clock className="mx-auto text-slate-200 mb-4" />
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Menunggu ulasan<br/>dari pembimbing.</p>
                    </div>
                )}
              </div>

             {/* Card Dokumen & Catatan Mahasiswa */}
           <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback Dosen</h3>
  
            {feedback?.file_url ? (
              <button
                onClick={() => handleDownloadFeedback(feedback.file_url)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl mb-6 shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 group text-left overflow-hidden"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Icon wrapper dengan efek hover */}
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600 shrink-0 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                    <FileText size={24} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-900">
                      {decodeURIComponent(feedback.file_url.split("/").pop()?.split("_").slice(1).join("_") || "File Pelengkap")}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-medium group-hover:text-blue-500">
                      Klik untuk mengunduh dokumen
                    </p>
                  </div>
                </div>

                {/* Indikator Unduh di sisi kanan */}
                <div className="ml-4 p-2 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0">
                  <Download size={20} />
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-6 text-gray-400">
                <AlertCircle size={24} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  Mahasiswa belum mengunggah dokumen draft.
                </p>
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


