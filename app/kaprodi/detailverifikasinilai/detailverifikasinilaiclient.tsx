"use client";

import React, { useState, Suspense } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Printer
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Penilai {
  role_tabel: string;
  materi_uji: string;
  nama_dosen: string;
  nilai_angka: number | null;
  ttd_url: string | null;
}

export default function DetailVerifikasiNilaiPage() {
    return (
        <Suspense fallback={
          <main className="flex-1 flex flex-col items-center justify-center h-screen relative z-10 bg-[#F8F9FB]">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
          </main>
        }>
          <DetailVerifikasiNilai />
        </Suspense>
    );
}

// ================= FETCHER SWR =================
const fetchDetailNilaiSidang = async (sidangId: string | null) => {
  if (!sidangId) return null;

  const { data: sReq, error: sReqErr } = await supabase
    .from('sidang_requests')
    .select(`
      id, tanggal_sidang, proposal_id,
      proposal:proposals ( id, judul, status_lulus, user:profiles (id, nama, npm) )
    `)
    .eq('id', sidangId)
    .single();

  if (sReqErr || !sReq) throw new Error("Data tidak ditemukan");

  const prop = Array.isArray(sReq.proposal) ? sReq.proposal[0] : sReq.proposal;
  const usr = Array.isArray(prop?.user) ? prop?.user[0] : prop?.user;

  const dataMahasiswa = {
    user_id: usr?.id,
    nama: usr?.nama,
    npm: usr?.npm,
    judul: prop?.judul,
    tanggal_sidang: sReq.tanggal_sidang,
    status_lulus: prop?.status_lulus || false
  };

  const [ { data: sups }, { data: semReq } ] = await Promise.all([
    supabase.from('thesis_supervisors').select('role, dosen_id, dosen:profiles(nama, ttd_url)').eq('proposal_id', prop.id),
    supabase.from('seminar_requests').select('id').eq('proposal_id', prop.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  let exms: any = [];
  let semFeedbacks: any = [];
  
  if (semReq) {
    const [ { data: e }, { data: sf } ] = await Promise.all([
       supabase.from('examiners').select('role, dosen_id, dosen:profiles(nama, ttd_url)').eq('seminar_request_id', semReq.id),
       supabase.from('seminar_feedbacks').select('dosen_id, nilai_angka').eq('seminar_request_id', semReq.id)
    ]);
    exms = e || [];
    semFeedbacks = sf || [];
  }

  const { data: sidGrades } = await supabase.from('sidang_grades').select('dosen_id, nilai_akhir').eq('sidang_request_id', sidangId);

  let rekap: Penilai[] = [];
  let totalNilai = 0;
  let countNilai = 0;

  const addNilai = (roleTabel: string, materi: string, dosenIdTarget: string, dosenProfile: any, sourceTable: any[]) => {
    const gradeData = sourceTable?.find((g: any) => g.dosen_id === dosenIdTarget);
    const angka = gradeData ? parseFloat(gradeData.nilai_angka || gradeData.nilai_akhir) : null;
    rekap.push({ role_tabel: roleTabel, materi_uji: materi, nama_dosen: dosenProfile?.nama || "-", nilai_angka: angka, ttd_url: dosenProfile?.ttd_url || null });
    if (angka !== null) { totalNilai += angka; countNilai++; }
  };

  const p1 = sups?.find((s:any) => s.role === 'utama');
  const p2 = sups?.find((s:any) => s.role === 'pendamping');
  if (p1) addNilai("Pembimbing Utama", "Seminar 1", p1.dosen_id, p1.dosen, semFeedbacks || []);
  if (p2) addNilai("Co. Pembimbing", "Seminar 2", p2.dosen_id, p2.dosen, semFeedbacks || []);
  const e1 = exms?.find((e:any) => e.role === 'penguji1');
  const e2 = exms?.find((e:any) => e.role === 'penguji2');
  const e3 = exms?.find((e:any) => e.role === 'penguji3');
  if (e1) addNilai("Penguji 1", "Skripsi", e1.dosen_id, e1.dosen, sidGrades || []);
  if (e2) addNilai("Penguji 2", "Skripsi", e2.dosen_id, e2.dosen, sidGrades || []);
  if (e3) addNilai("Penguji 3", "Mata Kuliah", e3.dosen_id, e3.dosen, sidGrades || []);

  let nilaiAkhir = 0;
  let hurufMutu = "-";
  const isComplete = countNilai === 5;

  if (isComplete) {
    nilaiAkhir = totalNilai / 5;
    if (nilaiAkhir >= 80) hurufMutu = "A";
    else if (nilaiAkhir >= 70) hurufMutu = "B";
    else if (nilaiAkhir >= 60) hurufMutu = "C";
    else if (nilaiAkhir >= 50) hurufMutu = "D";
    else hurufMutu = "E";
  }

  return {
    dataMahasiswa,
    rekapNilai: rekap,
    isComplete,
    nilaiAkhir,
    hurufMutu
  };
};

function DetailVerifikasiNilai() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidangId = searchParams.get('id');

  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate } = useSWR(
    sidangId ? `verifikasi_nilai_${sidangId}` : null,
    () => fetchDetailNilaiSidang(sidangId),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000
    }
  );

  // --- EXTRACT CACHE DATA ---
  const dataMahasiswa = cache?.dataMahasiswa || null;
  const rekapNilai = cache?.rekapNilai || [];
  const isComplete = cache?.isComplete || false;
  const nilaiAkhir = cache?.nilaiAkhir || 0;
  const hurufMutu = cache?.hurufMutu || "-";
  const statusLulus = dataMahasiswa?.status_lulus || false;

  // --- LOCAL STATE ---
  const [isVerifying, setIsVerifying] = useState(false);

  // --- UTILS ---
  const terbilangAngka = (num: number | null) => {
    if (num === null || isNaN(num)) return "";
    const satuan = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    const terbilang = (n: number): string => {
      if (n < 12) return satuan[n];
      if (n < 20) return terbilang(n - 10) + " belas";
      if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 !== 0 ? " " + terbilang(n % 10) : "");
      return n.toString();
    };
    const parts = num.toFixed(2).split('.');
    const bulat = parseInt(parts[0]);
    const desimal = parts[1];
    let teks = terbilang(bulat);
    if (desimal && desimal !== "00") {
      teks += " koma " + satuan[parseInt(desimal[0])].toLowerCase() + " " + satuan[parseInt(desimal[1])].toLowerCase();
    }
    return teks.charAt(0).toUpperCase() + teks.slice(1).toLowerCase();
  };

  const formatTanggal = (dateString: string) => {
    if (!dateString || dateString === "-") return "-";
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(dateString);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // --- HANDLERS ---
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const getDosenName = (role: string) => rekapNilai.find(r => r.role_tabel === role)?.nama_dosen || "-";

    const htmlContent = `
      <html>
      <head>
        <title>Berita Acara - ${dataMahasiswa?.nama}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.3; }
          .header-row { display: flex; margin-bottom: 2px; }
          .label { width: 160px; }
          .colon { width: 20px; text-align: center; }
          .value { flex: 1; text-align: justify; }
          .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .main-table th, .main-table td { border: 1px solid black; padding: 8px; vertical-align: middle; }
          .bg-green { background-color: #e2efda !important; -webkit-print-color-adjust: exact; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-row"><div class="label">Nama Mahasiswa</div><div class="colon">:</div><div class="value">${dataMahasiswa?.nama}</div></div>
        <div class="header-row"><div class="label">N P M</div><div class="colon">:</div><div class="value">${dataMahasiswa?.npm}</div></div>
        <div class="header-row"><div class="label">Tanggal Sidang</div><div class="colon">:</div><div class="value">${formatTanggal(dataMahasiswa?.tanggal_sidang)}</div></div>
        <div class="header-row"><div class="label">Judul Skripsi</div><div class="colon">:</div><div class="value">${dataMahasiswa?.judul}</div></div>
        <br>
        <div class="header-row"><div class="label">Pembimbing Utama</div><div class="colon">:</div><div class="value">${getDosenName('Pembimbing Utama')}</div></div>
        <div class="header-row"><div class="label">Co. Pembimbing</div><div class="colon">:</div><div class="value">${getDosenName('Co. Pembimbing')}</div></div>
        <div class="header-row"><div class="label">Penguji 1</div><div class="colon">:</div><div class="value">${getDosenName('Penguji 1')}</div></div>
        <div class="header-row"><div class="label">Penguji 2</div><div class="colon">:</div><div class="value">${getDosenName('Penguji 2')}</div></div>
        <div class="header-row"><div class="label">Penguji 3</div><div class="colon">:</div><div class="value">${getDosenName('Penguji 3')}</div></div>

        <table class="main-table">
          <thead>
            <tr class="bg-green font-bold text-center">
              <th rowspan="2">Nama Penguji</th>
              <th rowspan="2">Materi Yang Di Uji</th>
              <th colspan="2">Nilai</th>
              <th rowspan="2">Tanda Tangan</th>
            </tr>
            <tr class="bg-green font-bold text-center">
              <th>Angka</th>
              <th>Huruf</th>
            </tr>
          </thead>
          <tbody>
            ${rekapNilai.map(item => `
              <tr>
                <td>${item.role_tabel}</td>
                <td>${item.materi_uji === 'Mata Kuliah' ? 'Mata Kuliah<br/>Keinformatikaan/Programming' : item.materi_uji}</td>
                <td class="text-center font-bold">${item.nilai_angka?.toFixed(2) || "-"}</td>
                <td class="font-bold">${terbilangAngka(item.nilai_angka)}</td>
                <td class="text-center">${item.ttd_url ? `<img src="${item.ttd_url}" height="35">` : ''}</td>
              </tr>
            `).join('')}
            <tr class="font-bold">
              <td colspan="2" class="text-center" style="padding: 12px; letter-spacing: 1px;">NILAI RATA-RATA</td>
              <td class="text-center">${nilaiAkhir.toFixed(3)}</td>
              <td class="text-center">Huruf Mutu</td>
              <td class="text-center" style="font-size: 16px;">${"A B C D E".replace(hurufMutu, `<u>${hurufMutu}</u>`)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleVerifikasiLulus = async () => {
    if (!confirm("Nyatakan mahasiswa ini LULUS sidang akhir?")) return;
    setIsVerifying(true);
    try {
      if (!dataMahasiswa?.user_id) throw new Error("ID User Mahasiswa tidak ditemukan.");
      const { error } = await supabase.from('proposals').update({ status_lulus: true }).eq('user_id', dataMahasiswa.user_id);
      
      if (error) throw error;

      alert("Mahasiswa berhasil dinyatakan Lulus!");
      mutate(); // Refresh status langsung ke true via SWR
    } catch (error: any) {
      alert("Gagal memproses verifikasi.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ================= UI RENDER =================
  if (!sidangId) return null;
  if (isLoading && !cache) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#F8F9FB] min-h-screen font-sans text-slate-700 custom-scrollbar">
      <div className="max-w-[1400px] mx-auto w-full">
        
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-4 mb-10 w-fit transition-all active:scale-95"
        >
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors">
            KEMBALI KE DAFTAR
          </span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* KOLOM KIRI (Data Mhs & Tabel Nilai) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex items-center gap-12">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">MAHASISWA</p>
                <p className="text-sm font-bold text-slate-800 tracking-tight">{dataMahasiswa?.nama}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">NPM</p>
                <p className="text-sm font-bold text-slate-800 tracking-tight">{dataMahasiswa?.npm}</p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100">
                    <th className="py-6 px-8">PENGUJI/PEMBIMBING</th>
                    <th className="py-6 px-8 text-center">ANGKA</th>
                    <th className="py-6 px-8 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rekapNilai.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-8">
                        <p className="text-xs font-bold text-slate-800 uppercase">{item.role_tabel}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{item.nama_dosen}</p>
                      </td>
                      <td className="py-6 px-8 text-center font-black text-blue-600 text-base">{item.nilai_angka?.toFixed(2) || "-"}</td>
                      <td className="py-6 px-8 text-center">
                        {item.nilai_angka ? 
                          <span className="inline-flex text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-emerald-100">SELESAI</span> : 
                          <span className="inline-flex text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-amber-100">PENDING</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-center">
                 <button disabled={!isComplete} onClick={handlePrintPDF} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50">
                   <Printer size={14}/> CETAK REKAP PDF
                 </button>
              </div>
            </div>
            
          </div>

          {/* KOLOM KANAN (Rata-rata & Button Lulus) */}
          <div className="lg:col-span-4 flex flex-col gap-6 sticky top-10">
            
            <div className="bg-blue-600 text-white rounded-[2.5rem] p-10 shadow-xl shadow-blue-200 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-3">RATA-RATA AKHIR</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tighter">{nilaiAkhir > 0 ? nilaiAkhir.toFixed(2) : "0.00"}</span>
                <span className="text-2xl font-bold opacity-80">/ {hurufMutu}</span>
              </div>
            </div>
            
            {/* 🔥 Tombol "Dinyatakan Lulus" yang Terkunci otomatis (Disabled) 🔥 */}
            {statusLulus ? (
              <button 
                disabled={true} 
                className="w-full py-5 rounded-[2rem] font-black text-[11px] tracking-[0.2em] transition-all duration-300 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> MAHASISWA SUDAH DINYATAKAN LULUS
              </button>
            ) : (
              <button 
                disabled={!isComplete || isVerifying} 
                onClick={handleVerifikasiLulus} 
                className="w-full py-5 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30 transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isVerifying ? "MEMPROSES..." : "NYATAKAN LULUS SIDANG"}
              </button>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}