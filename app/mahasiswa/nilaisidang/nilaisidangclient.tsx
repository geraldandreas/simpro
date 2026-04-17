"use client";

import React, { useEffect, useState } from "react";
import { 
  Award, Clock, Printer, FileText, CheckCircle2 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Penilai {
  role_tabel: string;
  materi_uji: string;
  nama_dosen: string;
  nilai_angka: number | null;
  ttd_url: string | null;
}

export default function NilaiSidangMahasiswaClient() {
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [dataMahasiswa, setDataMahasiswa] = useState<any>(null);
  const [rekapNilai, setRekapNilai] = useState<Penilai[]>([]);
  const [nilaiAkhir, setNilaiAkhir] = useState<number>(0);
  const [hurufMutu, setHurufMutu] = useState<string>("-");

  // State khusus untuk Nilai Seminar
  const [nilaiSeminar, setNilaiSeminar] = useState<number | null>(null);
  const [hurufMutuSeminar, setHurufMutuSeminar] = useState<string>("-");
  const [isSeminarComplete, setIsSeminarComplete] = useState(false);

  useEffect(() => {
    fetchNilai();
  }, []);

  const fetchNilai = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('nama, npm').eq('id', user.id).single();
      const { data: proposal } = await supabase.from('proposals').select('id, judul').eq('user_id', user.id).single();
      
      if (!proposal) {
        setLoading(false);
        return;
      }

      const { data: sidangReq } = await supabase.from('sidang_requests').select('id, tanggal_sidang').eq('proposal_id', proposal.id).maybeSingle();
      
      setDataMahasiswa({
        nama: profile?.nama,
        npm: profile?.npm,
        judul: proposal.judul,
        tanggal_sidang: sidangReq?.tanggal_sidang || "-"
      });

      const [ { data: sups }, { data: semReq } ] = await Promise.all([
        supabase.from('thesis_supervisors').select('role, dosen_id, dosen:profiles(nama, ttd_url)').eq('proposal_id', proposal.id),
        supabase.from('seminar_requests').select('id').eq('proposal_id', proposal.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
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

      const { data: sidGrades } = await supabase.from('sidang_grades').select('dosen_id, nilai_akhir').eq('sidang_request_id', sidangReq?.id);

      // ==============================================================
      // 1. KALKULASI NILAI SEMINAR
      // ==============================================================
      let totalNilaiSem = 0;
      let countDosenSem = 0;

      // Fungsi bantuan untuk mencari dan menambahkan nilai seminar dari dosen
      const addNilaiSeminar = (dosenIdTarget: string) => {
        // Karena nilai_angka di seminar_feedbacks bisa jadi sudah rata-rata dari dosen tersebut
        // Kita cukup ambil nilai_angka yang tercatat untuk dosen itu
        const fb = semFeedbacks.find((f: any) => f.dosen_id === dosenIdTarget);
        if (fb && fb.nilai_angka !== null) {
          totalNilaiSem += parseFloat(fb.nilai_angka);
          countDosenSem++;
        }
      };

      const p1 = sups?.find((s:any) => s.role === 'utama' || s.role === 'pembimbing1');
      const p2 = sups?.find((s:any) => s.role === 'pendamping' || s.role === 'pembimbing2');
      const e1 = exms?.find((e:any) => e.role === 'penguji1');
      const e2 = exms?.find((e:any) => e.role === 'penguji2');
      const e3 = exms?.find((e:any) => e.role === 'penguji3');

      if (p1) addNilaiSeminar(p1.dosen_id);
      if (p2) addNilaiSeminar(p2.dosen_id);
      if (e1) addNilaiSeminar(e1.dosen_id);
      if (e2) addNilaiSeminar(e2.dosen_id);
      if (e3) addNilaiSeminar(e3.dosen_id);

      if (countDosenSem === 5) {
        setIsSeminarComplete(true);
        const rataSem = totalNilaiSem / 5;
        setNilaiSeminar(rataSem);
        
        if (rataSem >= 80) setHurufMutuSeminar("A");
        else if (rataSem >= 70) setHurufMutuSeminar("B");
        else if (rataSem >= 60) setHurufMutuSeminar("C");
        else if (rataSem >= 50) setHurufMutuSeminar("D");
        else setHurufMutuSeminar("E");
      }

      // ==============================================================
      // 2. KALKULASI NILAI SIDANG AKHIR (BERITA ACARA)
      // ==============================================================
      let rekap: Penilai[] = [];
      let totalNilaiSidang = 0;
      let countNilaiSidang = 0;

      const addNilaiSidang = (roleTabel: string, materi: string, dosenIdTarget: string, dosenProfile: any, sourceTable: any[]) => {
        // Untuk pembimbing (Seminar 1 & 2), kita pakai nilai seminar_feedbacks
        // Untuk penguji (Skripsi & Mata Kuliah), kita pakai nilai sidang_grades
        const gradeData = sourceTable?.find((g: any) => g.dosen_id === dosenIdTarget);
        const angka = gradeData ? parseFloat(gradeData.nilai_angka || gradeData.nilai_akhir) : null;
        
        rekap.push({ 
          role_tabel: roleTabel, 
          materi_uji: materi, 
          nama_dosen: dosenProfile?.nama || "-", 
          nilai_angka: angka,
          ttd_url: dosenProfile?.ttd_url || null
        });
        
        if (angka !== null) {
          totalNilaiSidang += angka;
          countNilaiSidang++;
        }
      };

      if (p1) addNilaiSidang("Pembimbing Utama", "Seminar 1", p1.dosen_id, p1.dosen, semFeedbacks);
      if (p2) addNilaiSidang("Co. Pembimbing", "Seminar 2", p2.dosen_id, p2.dosen, semFeedbacks);
      if (e1) addNilaiSidang("Penguji 1", "Skripsi", e1.dosen_id, e1.dosen, sidGrades || []);
      if (e2) addNilaiSidang("Penguji 2", "Skripsi", e2.dosen_id, e2.dosen, sidGrades || []);
      if (e3) addNilaiSidang("Penguji 3", "Mata Kuliah Keinformatikaan/Programming", e3.dosen_id, e3.dosen, sidGrades || []);

      setRekapNilai(rekap);

      if (countNilaiSidang === 5) {
        setIsComplete(true);
        const rataRata = totalNilaiSidang / 5;
        setNilaiAkhir(rataRata);
        
        if (rataRata >= 80) setHurufMutu("A");
        else if (rataRata >= 70) setHurufMutu("B");
        else if (rataRata >= 60) setHurufMutu("C");
        else if (rataRata >= 50) setHurufMutu("D");
        else setHurufMutu("E");
      } else {
        setIsComplete(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: black; line-height: 1.3; }
          .header-row { display: flex; margin-bottom: 2px; }
          .label { width: 150px; }
          .colon { width: 20px; text-align: center; }
          .value { flex: 1; }
          .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .main-table th, .main-table td { border: 1px solid black; padding: 8px; vertical-align: middle; }
          .bg-green { background-color: #e2efda !important; -webkit-print-color-adjust: exact; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20px;">REKAPITULASI NILAI SIDANG AKHIR (BERITA ACARA)</div>
        
        <div class="header-row"><div class="label">Nama Mahasiswa</div><div class="colon">:</div><div class="value">${dataMahasiswa?.nama}</div></div>
        <div class="header-row"><div class="label">N P M</div><div class="colon">:</div><div class="value">${dataMahasiswa?.npm}</div></div>
        <div class="header-row"><div class="label">Tanggal Sidang</div><div class="colon">:</div><div class="value">${new Date(dataMahasiswa?.tanggal_sidang).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
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
                <td>${item.materi_uji}</td>
                <td class="text-center font-bold">${item.nilai_angka?.toFixed(2) || "-"}</td>
                <td class="font-bold">${terbilangAngka(item.nilai_angka)}</td>
                <td class="text-center">${item.ttd_url ? `<img src="${item.ttd_url}" height="35">` : ''}</td>
              </tr>
            `).join('')}
            <tr class="font-bold">
              <td colspan="2" class="text-center">NILAI RATA-RATA SIDANG</td>
              <td class="text-center">${nilaiAkhir.toFixed(3)}</td>
              <td class="text-center">Huruf Mutu</td>
              <td class="text-center" style="font-size: 16px;">${hurufMutu}</td>
            </tr>
          </tbody>
        </table>
        
        <br><br>
        <div style="font-weight: bold; font-size: 12pt; margin-bottom: 10px;">REKAPITULASI NILAI MATA KULIAH SEMINAR</div>
        <table class="main-table" style="width: 50%;">
           <tr>
              <td style="width: 60%; font-weight:bold;">NILAI RATA-RATA SEMINAR</td>
              <td style="width: 20%; text-align:center; font-weight:bold;">${isSeminarComplete && nilaiSeminar ? nilaiSeminar.toFixed(2) : '-'}</td>
           </tr>
           <tr>
              <td style="font-weight:bold;">HURUF MUTU SEMINAR</td>
              <td style="text-align:center; font-weight:bold; font-size: 16px;">${isSeminarComplete ? hurufMutuSeminar : '-'}</td>
           </tr>
        </table>

      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans text-slate-700 overflow-hidden">
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB]">

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Rekapitulasi Penilaian</h1>
              <p className="text-slate-500 font-medium mt-1">Hasil akumulasi penilaian Seminar dan Sidang Akhir dari Dewan Penguji.</p>
            </div>

            {loading ? (
              // 🔥 SKELETON LOADER MODERN 🔥
              <div className="animate-pulse space-y-10 w-full">
                {/* Mock Box Seminar Atas */}
                <div className="h-40 bg-slate-200 rounded-[2.5rem] w-full"></div>
                
                {/* Mock Grid Bawah (Sidang & Cetak) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Mock Box Hijau (Lulus) */}
                  <div className="h-64 bg-slate-200 rounded-[2.5rem] w-full flex flex-col justify-center p-10 gap-6">
                    <div className="h-4 w-32 bg-slate-300 rounded-full"></div>
                    <div className="h-10 w-3/4 bg-slate-300 rounded-full"></div>
                    <div className="h-16 w-1/2 bg-slate-300 rounded-2xl mt-auto"></div>
                  </div>
                  {/* Mock Box Putih (Cetak) */}
                  <div className="h-64 bg-slate-200 rounded-[2.5rem] w-full flex flex-col items-center justify-center gap-6">
                    <div className="h-20 w-20 bg-slate-300 rounded-full"></div>
                    <div className="h-6 w-48 bg-slate-300 rounded-full"></div>
                    <div className="h-12 w-40 bg-slate-300 rounded-2xl mt-4"></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* BOX BARU: REKAPITULASI NILAI SEMINAR */}
                {isSeminarComplete && (
                   <div className="mb-10 bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-200/50 p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center animate-in slide-in-from-top-4 duration-500">
                     <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Mata Kuliah Seminar</p>
                        <h2 className="text-3xl font-black tracking-tight">LULUS MATA KULIAH SEMINAR</h2>
                        <p className="text-sm font-medium mt-2 text-blue-100 max-w-md">Nilai ini merupakan rata-rata akumulasi dari seluruh Dewan Penguji pada saat Seminar Skripsi.</p>
                     </div>
                     
                     <div className="flex items-center gap-6 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20 relative z-10">
                       <div className="text-center md:text-right">
                         <p className="text-[10px] font-black uppercase mb-1 opacity-80 tracking-widest">Rata-Rata Final</p>
                         <p className="text-5xl font-black tracking-tighter">{nilaiSeminar?.toFixed(2)}</p>
                       </div>
                       <div className="w-[1px] h-12 bg-white/30"></div>
                       <div className="flex flex-col items-center justify-center">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Mutu</p>
                         <span className="text-3xl font-black text-amber-300 drop-shadow-md">{hurufMutuSeminar}</span>
                       </div>
                     </div>
                     <Clock size={200} className="absolute -left-10 -bottom-10 opacity-5 text-white" />
                   </div>
                )}

                {/* BOX LAMA: REKAPITULASI NILAI SIDANG */}
                {!isComplete ? (
                  <div className="bg-white rounded-[2.5rem] shadow-xl p-12 text-center border border-white flex flex-col items-center">
                    <Clock size={48} className="text-amber-500 mb-6" />
                    <h2 className="text-2xl font-black text-slate-800 uppercase mb-2">Penilaian Sidang Sedang Diproses</h2>
                    <div className="w-full max-w-lg bg-slate-50 p-6 rounded-[2rem] text-left mt-8">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status Pengisian Nilai</p>
                       {rekapNilai.map((item, idx) => (
                         <div key={idx} className="flex justify-between mb-2">
                           <span className="text-sm font-bold">{item.role_tabel}</span>
                           <span className={`text-xs font-black uppercase ${item.nilai_angka ? 'text-emerald-500' : 'text-amber-500'}`}>
                             {item.nilai_angka ? 'Selesai' : 'Menunggu'}
                           </span>
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-emerald-500 text-white rounded-[2.5rem] shadow-xl p-10 relative overflow-hidden flex flex-col justify-center">
                      <Award size={160} className="absolute -right-6 -top-6 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-90">Status Penilaian</p>
                      <h2 className="text-3xl font-black mb-8 leading-none">LULUS SIDANG AKHIR</h2>
                      
                      <div className="flex items-center gap-6 mt-auto">
                        <div>
                          <p className="text-[10px] font-black uppercase mb-1 opacity-80 tracking-widest">Rata-Rata</p>
                          <p className="text-5xl font-black tracking-tighter">{nilaiAkhir.toFixed(2)}</p>
                        </div>
                        <div className="ml-2">
                           <span className="text-xl font-black px-5 py-2.5 bg-white text-emerald-600 rounded-xl shadow-sm uppercase tracking-widest border-2 border-emerald-100">
                             Mutu: {hurufMutu}
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-[2.5rem] shadow-xl p-10 flex flex-col items-center justify-center text-center border border-slate-100">
                      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                         <FileText size={32} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 uppercase mb-2 tracking-tight">Dokumen Berita Acara</h3>
                      <p className="text-xs font-medium text-slate-500 mb-8 max-w-[200px]">Cetak laporan resmi kelulusan Sidang Akhir Mahasiswa.</p>
                     <button onClick={handlePrintPDF} className="mt-6 inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all">
                    <Printer size={18} /> Cetak / Unduh PDF
                  </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}