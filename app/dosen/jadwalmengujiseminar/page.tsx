"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Download, Upload, Save, 
  CheckCircle2, FileText, MessageSquare, AlertCircle, ShieldCheck, Lock,
  Calculator
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function JadwalMengujiSeminarDosenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 tracking-widest uppercase">Memuat Halaman...</div>}>
      <DetailContent />
    </Suspense>
  );
}

function DetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); 
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  // 🔥 STATE UNTUK 5 INDIKATOR (DIGUNAKAN OLEH PENGUJI & PEMBIMBING) 🔥
  const [n1, setN1] = useState(""); 
  const [n2, setN2] = useState(""); 
  const [n3, setN3] = useState(""); 
  const [n4, setN4] = useState(""); 
  const [n5, setN5] = useState(""); 
  
  const [nilai, setNilai] = useState(""); // Nilai Akhir Hasil Kalkulasi

  const [komentar, setKomentar] = useState("");
  const [fileRevisi, setFileRevisi] = useState<File | null>(null);
  const [statusRevisi, setStatusRevisi] = useState("revisi");
  
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [pembimbing1, setPembimbing1] = useState("..................................................................");
  const [pembimbing2, setPembimbing2] = useState("..................................................................");
  const [penguji1, setPenguji1] = useState("..................................................................");
  const [penguji2, setPenguji2] = useState("..................................................................");
  const [penguji3, setPenguji3] = useState("..................................................................");
  const [tanggalSeminar, setTanggalSeminar] = useState("..................................................................");
  const [myRole, setMyRole] = useState("");
  const [dosenTtdUrl, setDosenTtdUrl] = useState<string | null>(null); 

  const isPenguji = myRole.toLowerCase().includes('penguji');

  // Memastikan bahwa kode ini hanya berjalan setelah komponen dipasang (mounted) di browser
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (id && isMounted) fetchDetailSeminar();
  }, [id, isMounted]);

  // 🔥 EFEK UNTUK MENGHITUNG OTOMATIS NILAI RATA-RATA BIASA 🔥
  useEffect(() => {
    if (!isLocked) {
      const v1 = parseFloat(n1) || 0;
      const v2 = parseFloat(n2) || 0;
      const v3 = parseFloat(n3) || 0;
      const v4 = parseFloat(n4) || 0;
      const v5 = parseFloat(n5) || 0;

      let countFilled = 0;
      if (n1 !== "") countFilled++;
      if (n2 !== "") countFilled++;
      if (n3 !== "") countFilled++;
      if (n4 !== "") countFilled++;
      if (n5 !== "") countFilled++;

      if (countFilled > 0) {
        const calc = (v1 + v2 + v3 + v4 + v5) / countFilled;
        setNilai(calc.toFixed(2));
      } else {
        setNilai("");
      }
    }
  }, [n1, n2, n3, n4, n5, isLocked]);

  const fetchDetailSeminar = async () => {
    try {
      setLoading(true);
      const { data: req, error } = await supabase.from('seminar_requests').select(`
          id, status, proposal:proposals (id, judul, bidang, user:profiles ( nama, npm, avatar_url ), docs:seminar_documents ( nama_dokumen, file_url ))
        `).eq('id', id).single();

      if (error) throw error;

      const rawProposal = (req as any).proposal;
      const propData = Array.isArray(rawProposal) ? rawProposal[0] : rawProposal;
      setData({ ...req, proposal: propData });

      const docs = propData?.docs;
      const docsArr = Array.isArray(docs) ? docs : docs ? [docs] : [];
      const draftDoc = docsArr.find((d: any) => d?.nama_dokumen === 'draft_skripsi');
      
      if (draftDoc?.file_url) {
        const { data: signedData } = await supabase.storage.from('docseminar').createSignedUrl(draftDoc.file_url, 3600);
        setDraftUrl(signedData?.signedUrl || null);
      }

      if (propData?.id) {
        const [ { data: sups }, { data: exms }, { data: sched } ] = await Promise.all([
          supabase.from('thesis_supervisors').select('role, dosen_id, dosen:profiles(nama)').eq('proposal_id', propData.id),
          supabase.from('examiners').select('role, dosen_id, dosen:profiles(nama)').eq('seminar_request_id', id),
          supabase.from('seminar_schedules').select('tanggal').eq('seminar_request_id', id).maybeSingle()
        ]);

        if (sups) {
          setPembimbing1(sups.find((s:any) => s.role?.toLowerCase().includes('utama') || s.role?.toLowerCase().includes('pembimbing1'))?.dosen?.nama || "..................................................................");
          setPembimbing2(sups.find((s:any) => s.role?.toLowerCase().includes('pendamping') || s.role?.toLowerCase().includes('pembimbing2'))?.dosen?.nama || "..................................................................");
        }
        if (exms) {
          setPenguji1(exms.find((e:any) => e.role?.toLowerCase().includes('penguji1'))?.dosen?.nama || "..................................................................");
          setPenguji2(exms.find((e:any) => e.role?.toLowerCase().includes('penguji2'))?.dosen?.nama || "..................................................................");
          setPenguji3(exms.find((e:any) => e.role?.toLowerCase().includes('penguji3'))?.dosen?.nama || "..................................................................");
        }
        if (sched?.tanggal) setTanggalSeminar(sched.tanggal);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dosenProfile } = await supabase.from('profiles').select('ttd_url').eq('id', user.id).single();
          if (dosenProfile) setDosenTtdUrl(dosenProfile.ttd_url);

          let detectedRole = "";
          if (sups) {
            const mySup = sups.find((s:any) => s.dosen_id === user.id);
            if (mySup) {
              const r = mySup.role?.toLowerCase() || '';
              if (r.includes('utama') || r.includes('pembimbing1')) detectedRole = 'pembimbing1';
              else if (r.includes('pendamping') || r.includes('pembimbing2')) detectedRole = 'pembimbing2';
              else detectedRole = mySup.role;
            }
          }
          if (exms && !detectedRole) {
            const myExm = exms.find((e:any) => e.dosen_id === user.id);
            if (myExm) {
              const r = myExm.role?.toLowerCase() || '';
              if (r.includes('penguji1')) detectedRole = 'penguji1';
              else if (r.includes('penguji2')) detectedRole = 'penguji2';
              else if (r.includes('penguji3')) detectedRole = 'penguji3';
              else detectedRole = myExm.role;
            }
          }
          setMyRole(detectedRole);

          const { data: existingFeedback } = await supabase.from('seminar_feedbacks').select('*').eq('seminar_request_id', id).eq('dosen_id', user.id).maybeSingle(); 
          if (existingFeedback) {
            setNilai(existingFeedback.nilai_angka?.toString() || "");
            
            // 🔥 AMBIL DATA JSON RINCIAN JIKA ADA 🔥
            if (existingFeedback.detail_nilai) {
              const detail = existingFeedback.detail_nilai;
              setN1(detail.n1 || "");
              setN2(detail.n2 || "");
              setN3(detail.n3 || "");
              setN4(detail.n4 || "");
              setN5(detail.n5 || "");
            }

            setKomentar(existingFeedback.catatan_revisi || "");
            setStatusRevisi(existingFeedback.status_revisi || "revisi");
            setExistingFileUrl(existingFeedback.file_revisi_url || null);
            setIsLocked(true);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching detail:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportWord = () => {
    const formattedDate = tanggalSeminar.includes("-") 
      ? new Date(tanggalSeminar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : tanggalSeminar;

    const formatKomentar = (text: string) => {
      if (!text) return "<br><br><br>";
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) return "<br><br><br>";
      return lines.map((line, idx) => `${String.fromCharCode(65 + idx)}. ${line}`).join('<br><br>');
    };

    const generateRow = (no: number, labelTitle: string, namaDosen: string, roleKey: string) => {
      const isMe = myRole === roleKey;
      const isi = isMe ? komentar : ""; 
      
      const ttdHtml = (isMe && dosenTtdUrl) 
        ? `<div style="text-align: center;">
             <img src="${dosenTtdUrl}" width="98" height="95" style="width: 2.6cm; height: 2.51cm;" alt="TTD" />
           </div>` 
        : "";

      return `
      <tr>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: center;">${no}.</td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: top;">
              ${labelTitle}<br/>
              <strong>${namaDosen !== ".................................................................." ? namaDosen : ""}</strong><br/><br/>
              ${formatKomentar(isi)}
          </td>
          <td style="border: 1px solid black; padding: 8px;"></td>
          <td style="border: 1px solid black; padding: 8px; vertical-align: middle; text-align: center; width: 15%;">
              ${ttdHtml}
          </td>
      </tr>
      `;
    };

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Matriks Perbaikan</title></head><body><div style="text-align: center; font-weight: bold; font-family: 'Times New Roman', Times, serif; line-height: 1.5; font-size: 14pt;">MATRIKS PERBAIKAN SKRIPSI<br>PROGRAM STUDI TEKNIK INFORMATIKA<br>FAKULTAS MATEMATIKA DAN ILMU PENGETAHUAN ALAM<br>UNIVERSITAS PADJADJARAN</div><br><br><table style="font-family: 'Times New Roman', Times, serif; border: none; width: 100%; font-size: 12pt;"><tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>${data?.proposal?.user?.nama || '..................................................................'}</td></tr><tr><td>NPM</td><td>:</td><td>${data?.proposal?.user?.npm || '..................................................................'}</td></tr><tr><td>Tanggal Sidang</td><td>:</td><td>${formattedDate}</td></tr><tr><td>Judul Skripsi</td><td>:</td><td>${data?.proposal?.judul || '..................................................................'}</td></tr><tr><td>Pembimbing 1</td><td>:</td><td>${pembimbing1}</td></tr><tr><td>Pembimbing 2</td><td>:</td><td>${pembimbing2}</td></tr><tr><td>Penguji 1</td><td>:</td><td>${penguji1}</td></tr><tr><td>Penguji 2</td><td>:</td><td>${penguji2}</td></tr><tr><td>Penguji 3</td><td>:</td><td>${penguji3}</td></tr></table><br><br><table style="font-family: 'Times New Roman', Times, serif; border-collapse: collapse; width: 100%; border: 1px solid black; font-size: 12pt;"><thead><tr><th style="border: 1px solid black; padding: 8px; width: 5%;">No</th><th style="border: 1px solid black; padding: 8px; width: 45%;">Uraian masukan pembimbing dan penguji (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 40%;">Uraian Perbaikan yang sudah dilakukan (No Halaman)</th><th style="border: 1px solid black; padding: 8px; width: 10%;">TTD</th></tr></thead><tbody>${generateRow(1, 'Pembimbing 1', pembimbing1, 'pembimbing1')}${generateRow(2, 'Pembimbing 2', pembimbing2, 'pembimbing2')}${generateRow(3, 'Penguji 1', penguji1, 'penguji1')}${generateRow(4, 'Penguji 2', penguji2, 'penguji2')}${generateRow(5, 'Penguji 3', penguji3, 'penguji3')}</tbody></table></body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const mhsName = data?.proposal?.user?.nama ? data.proposal.user.nama.replace(/\s+/g, '_') : 'Mahasiswa';
    link.download = `Matriks_Perbaikan_${mhsName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isLocked) return; 

    if (statusRevisi === "diterima" && !dosenTtdUrl) {
      alert("⚠️ PERHATIAN!\n\nAnda belum mengunggah Tanda Tangan Digital.\nSilakan masuk ke menu 'Settings' untuk mengunggah TTD Anda sebelum memberikan ACC Lanjut Sidang.");
      return; 
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda belum login.");

      let fileUrl = existingFileUrl;

      if (fileRevisi) {
        const fileExt = fileRevisi.name.split('.').pop();
        const safeName = fileRevisi.name.replace(/[^a-zA-Z0-9]/g, "_"); 
        const fileName = `revisi_${id}_${user.id}_${Date.now()}_${safeName}.${fileExt}`; 
        
        const { error: uploadError } = await supabase.storage
          .from('feedback_seminar')
          .upload(fileName, fileRevisi, { upsert: true });

        if (uploadError) throw uploadError;
        fileUrl = fileName;
      }

      const detailNilaiJson = {
        n1: parseFloat(n1) || 0,
        n2: parseFloat(n2) || 0,
        n3: parseFloat(n3) || 0,
        n4: parseFloat(n4) || 0,
        n5: parseFloat(n5) || 0
      };

      const { error: upsertError } = await supabase.from('seminar_feedbacks').upsert({
          seminar_request_id: id,
          dosen_id: user.id,
          nilai_angka: parseFloat(nilai),
          detail_nilai: detailNilaiJson, 
          catatan_revisi: komentar,
          file_revisi_url: fileUrl, 
          status_revisi: statusRevisi 
        }, { onConflict: 'seminar_request_id,dosen_id' }); 

      if (upsertError) throw upsertError;

      alert("Penilaian berhasil disimpan!");
      router.push('/dosen/jadwalpengujiseminar'); // 🔥 Ini rutenya! 
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Mencegah komponen melakukan rendering sampai dipasang (mounted) di client
  if (!isMounted) return null;

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center p-20 font-black text-red-400 tracking-widest uppercase bg-[#F8F9FB]">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        PARAMETER ID TIDAK DITEMUKAN
      </div>
    </div>
  );

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 tracking-widest uppercase">Memuat Detail Penilaian...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-10 font-sans text-slate-700">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest mb-8 transition-all">
          <ArrowLeft size={16} /> Kembali ke Jadwal
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 mb-5 overflow-hidden border-4 border-slate-50 relative shrink-0 flex items-center justify-center font-black text-slate-300 text-3xl uppercase">
                {data?.proposal?.user?.avatar_url ? <img src={data.proposal.user.avatar_url} className="object-cover w-full h-full" alt="Profil" /> : data?.proposal?.user?.nama?.charAt(0) || "?"}
              </div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight mb-1">{data?.proposal?.user?.nama || "Mahasiswa"}</h2>
              <p className="text-xs font-bold text-slate-400 tracking-widest">{data?.proposal?.user?.npm || "-"}</p>
              <div className="w-full h-[1px] bg-slate-100 my-8"></div>
              <div className="w-full text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dokumen Skripsi Mahasiswa</p>
                {draftUrl ? (
                  <a href={draftUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg group">
                    <Download size={16} className="group-hover:-translate-y-1 transition-transform" /> Unduh Draft
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400"><AlertCircle size={24} className="mb-2 opacity-50" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">Belum Diunggah</p></div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white h-full flex flex-col justify-between relative">
              
              {isLocked && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500 shrink-0 mt-0.5">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em] mb-1.5">Data Telah Disimpan & Terkunci</p>
                    <p className="text-xs text-blue-600 font-medium leading-relaxed">
                      Penilaian awal telah dikunci. Untuk melanjutkan proses tanya jawab revisi atau mengubah status ACC, silakan gunakan menu <b>Perbaikan Seminar Mahasiswa</b> di Sidebar Anda.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Lembar Penilaian</h3>
                  <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <p className="text-slate-600 text-sm font-bold italic leading-relaxed">"{data?.proposal?.judul || "Judul belum tersedia"}"</p>
                  </div>
                </div>

                <div className="mb-8 p-8 border-2 border-slate-100 rounded-[2rem] bg-slate-50/50">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                    <Calculator size={14} className="text-blue-500" /> 
                    {isPenguji ? "Rincian Nilai Ujian Skripsi" : "Rincian Nilai Pelaksanaan Seminar"} (Skala 0-100)
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">1. Sistematika Penulisan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n1} onChange={(e) => setN1(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">2. Isi Skripsi</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n2} onChange={(e) => setN2(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">3. Analisis & Pembahasan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n3} onChange={(e) => setN3(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">4. Penguasaan Pengetahuan</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n4} onChange={(e) => setN4(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 truncate">5. Cara Menanggapi & Memecahkan Masalah</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n5} onChange={(e) => setN5(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`} />
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rata-Rata Otomatis</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">{nilai ? nilai : "0.00"}</p>
                    </div>
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black tracking-widest uppercase">
                      NILAI RATA-RATA
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3"><Upload size={14} className="text-blue-500" /> Upload Draft Feedback (PDF)</label>
                  
                  {isLocked ? (
                    <div className="p-4 border-2 border-slate-200 bg-slate-50 rounded-[1.5rem] flex flex-col items-center justify-center h-[72px] cursor-not-allowed opacity-80">
                      <p className="text-[10px] font-black uppercase tracking-widest truncate w-full text-center px-4 text-slate-400">
                        {existingFileUrl ? "File Lampiran Tersimpan" : "Tidak Ada Lampiran"}
                      </p>
                    </div>
                  ) : (
                    <div className="relative group">
                      <input type="file" accept=".pdf" onChange={(e) => setFileRevisi(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`p-4 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center transition-all h-[72px] ${fileRevisi ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 group-hover:border-blue-300 group-hover:bg-blue-50/30'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest truncate w-full text-center px-4 ${fileRevisi ? 'text-blue-600' : 'text-slate-400'}`}>{fileRevisi ? fileRevisi.name : "Klik / Drop PDF Di Sini"}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3"><ShieldCheck size={14} className="text-blue-500" /> Keputusan Revisi</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => setStatusRevisi("revisi")} 
                      className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${
                        statusRevisi === "revisi" 
                          ? `border-red-400 bg-red-50 text-red-600 ${isLocked ? 'opacity-80' : ''}` 
                          : `border-slate-100 bg-slate-50 text-slate-400 ${isLocked ? '' : 'hover:border-red-200'}`
                      }`}
                    >
                      <AlertCircle size={18} /> Ada Revisi
                    </button>
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => setStatusRevisi("diterima")} 
                      className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${
                        statusRevisi === "diterima" 
                          ? `border-emerald-400 bg-emerald-50 text-emerald-600 ${isLocked ? 'opacity-80' : ''}` 
                          : `border-slate-100 bg-slate-50 text-slate-400 ${isLocked ? '' : 'hover:border-emerald-200'}`
                      }`}
                    >
                      <ShieldCheck size={18} /> ACC Lanjut Sidang
                    </button>
                  </div>
                </div>

                <div className="mb-10">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare size={14} className="text-blue-500" /> Catatan & Komentar</label>
                    <button 
                      type="button" 
                      onClick={handleExportWord} 
                      className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                    >
                      <FileText size={12}/> Unduh Matriks (.doc)
                    </button>
                  </div>
                  <textarea 
                    rows={5} required value={komentar} onChange={(e) => setKomentar(e.target.value)} 
                    placeholder="Tuliskan poin-poin yang harus direvisi..." 
                    disabled={isLocked}
                    className={`w-full p-6 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all placeholder:text-slate-300 ${isLocked ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-80' : 'bg-slate-50 text-slate-600 shadow-inner'}`} 
                  />
                </div>
              </div>

              {!isLocked && (
                <div>
                  <button type="submit" disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-900 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 active:scale-[0.98]">
                    {submitting ? "MEMPROSES..." : <><Save size={18} /> Simpan Penilaian</>}
                  </button>
                </div>
              )}

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}