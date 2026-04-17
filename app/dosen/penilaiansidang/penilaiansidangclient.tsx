"use client";

import React, { useEffect, useState, Suspense } from "react";
import useSWR from "swr"; // 🚀 Import SWR
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Download, Save, 
  FileText, MessageSquare, AlertCircle, Lock,
  Calculator
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function JadwalMengujiSidangDosenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 tracking-widest uppercase">Memuat Halaman...</div>}>
      <DetailContentSidang />
    </Suspense>
  );
}

// ================= FETCHER SWR =================
const fetchDetailSidang = async (id: string | null) => {
  if (!id) return null;

  // 1. Fetch Data Sidang
  const { data: sidang, error } = await supabase
    .from('sidang_requests')
    .select(`
      id, status, 
      proposal:proposals (
        id, judul, bidang, 
        user:profiles ( nama, npm, avatar_url )
      )
    `)
    .or(`id.eq.${id},seminar_request_id.eq.${id}`)
    .maybeSingle();

  if (error) throw error;
  if (!sidang) throw new Error("Data sidang tidak ditemukan.");

  const propData = Array.isArray(sidang.proposal) ? sidang.proposal[0] : sidang.proposal;
  const resultData = { ...sidang, proposal: propData };
  
  let draftUrl = null;
  let existingNilai = null;

  if (propData?.id) {
    // 2. Fetch Dokumen Draft Sidang
    const { data: docSidang } = await supabase
      .from("sidang_documents_verification")
      .select("file_url")
      .eq("proposal_id", propData.id)
      .eq("nama_dokumen", "file_skripsi_final")
      .maybeSingle();

    if (docSidang?.file_url) {
      const { data: signedData } = await supabase.storage.from('docseminar').createSignedUrl(docSidang.file_url, 3600);
      draftUrl = signedData?.signedUrl || null;
    }

    // 3. Fetch Existing Nilai Sidang Dosen
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: nilai } = await supabase
        .from('sidang_grades')
        .select('*')
        .eq('sidang_request_id', sidang.id)
        .eq('dosen_id', user.id)
        .maybeSingle();

      existingNilai = nilai || null;
    }
  }

  return {
    data: resultData,
    draftUrl,
    existingNilai
  };
};

function DetailContentSidang() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); 
  const router = useRouter();
  
  // 🔥 IMPLEMENTASI SWR 🔥
  const { data: cache, isLoading, mutate, error } = useSWR(
    id ? `jadwal_menguji_sidang_dosen_detail_${id}` : null,
    () => fetchDetailSidang(id),
    {
      revalidateOnFocus: true,
      refreshInterval: 60000 
    }
  );

  // --- EXTRACT CACHE DATA ---
  const data: any = cache?.data || null;
  const draftUrl = cache?.draftUrl || null;

  const [submitting, setSubmitting] = useState(false);

  // 🔥 STATE UNTUK 5 INDIKATOR NILAI SIDANG 🔥
  const [n1, setN1] = useState(""); 
  const [n2, setN2] = useState(""); 
  const [n3, setN3] = useState(""); 
  const [n4, setN4] = useState(""); 
  const [n5, setN5] = useState(""); 
  
  const [nilai, setNilai] = useState(""); 
  const [hurufMutu, setHurufMutu] = useState("-");
  const [isLocked, setIsLocked] = useState(false);

  // Jika error (misal data tidak ditemukan), kembalikan ke halaman sebelumnya
  useEffect(() => {
    if (error) {
      alert(error.message || "Gagal memuat data sidang");
      router.back();
    }
  }, [error, router]);

  // Sync state lokal ketika data SWR berhasil dimuat & ada history nilai
  useEffect(() => {
    if (cache?.existingNilai) {
      const finalVal = cache.existingNilai.nilai_akhir || 0;
      setNilai(finalVal.toString());
      
      if (finalVal >= 80) setHurufMutu("A");
      else if (finalVal >= 70) setHurufMutu("B");
      else if (finalVal >= 60) setHurufMutu("C");
      else if (finalVal >= 50) setHurufMutu("D");
      else setHurufMutu("E");

      if (cache.existingNilai.detail_nilai) {
        const dn = cache.existingNilai.detail_nilai;
        setN1(dn.n1 || ""); setN2(dn.n2 || ""); setN3(dn.n3 || ""); setN4(dn.n4 || ""); setN5(dn.n5 || "");
      }
      setIsLocked(true);
    }
  }, [cache?.existingNilai]);

  // 🔥 KALKULASI RATA-RATA OTOMATIS & KONVERSI HURUF MUTU 🔥
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
        
        // Logika Huruf Mutu
        if (calc >= 80) setHurufMutu("A");
        else if (calc >= 70) setHurufMutu("B");
        else if (calc >= 60) setHurufMutu("C");
        else if (calc >= 50) setHurufMutu("D");
        else setHurufMutu("E");
        
      } else {
        setNilai("");
        setHurufMutu("-");
      }
    }
  }, [n1, n2, n3, n4, n5, isLocked]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.id || isLocked) return; 

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir.");

      const detailNilaiJson = {
        n1: parseFloat(n1) || 0,
        n2: parseFloat(n2) || 0,
        n3: parseFloat(n3) || 0,
        n4: parseFloat(n4) || 0,
        n5: parseFloat(n5) || 0
      };

      const { error: upsertError } = await supabase.from('sidang_grades').upsert({
          sidang_request_id: data.id, 
          dosen_id: user.id,
          nilai_akhir: parseFloat(nilai),
          detail_nilai: detailNilaiJson, 
          catatan: null, 
        }, { onConflict: 'sidang_request_id,dosen_id' }); 

      if (upsertError) throw upsertError;

      alert("Nilai Sidang berhasil disimpan!");
      mutate(); // Refresh SWR State
      router.back(); 
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) return null;
  if (isLoading && !cache) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] outline-none focus:outline-none">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-10 font-sans text-slate-700 outline-none focus:outline-none">
      <div className="max-w-6xl mx-auto outline-none focus:outline-none">
        <div className="mb-10 outline-none focus:outline-none">
          <button onClick={() => router.back()} className="group flex items-center gap-4 mb-8 w-fit transition-all active:scale-95 outline-none focus:outline-none">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:shadow-md transition-all shadow-sm shrink-0 outline-none focus:outline-none">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform outline-none focus:outline-none" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] group-hover:text-blue-600 transition-colors outline-none focus:outline-none">
              KEMBALI KE JADWAL
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 outline-none focus:outline-none">
          <div className="lg:col-span-4 space-y-6 outline-none focus:outline-none">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white flex flex-col items-center text-center outline-none focus:outline-none">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 mb-5 overflow-hidden border-4 border-slate-50 relative shrink-0 flex items-center justify-center font-black text-slate-300 text-3xl uppercase outline-none focus:outline-none">
                {data?.proposal?.user?.avatar_url ? <img src={data.proposal.user.avatar_url} className="object-cover w-full h-full" alt="Profil" /> : data?.proposal?.user?.nama?.charAt(0) || "?"}
              </div>
              <h2 className="text-lg font-black text-slate-800 capitalize tracking-tight leading-tight mb-1 outline-none focus:outline-none">
                {data?.proposal?.user?.nama?.toLowerCase() || "Mahasiswa"}
              </h2>
              <p className="text-xs font-bold text-slate-400 tracking-widest outline-none focus:outline-none">{data?.proposal?.user?.npm || "-"}</p>
              <div className="w-full h-[1px] bg-slate-100 mb-8 mt-4 outline-none focus:outline-none"></div>
              <div className="w-full text-center outline-none focus:outline-none">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 outline-none focus:outline-none">File Skripsi Final</p>
                {draftUrl ? (
                  <a href={draftUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg group outline-none focus:outline-none">
                    <Download size={16} className="group-hover:-translate-y-1 transition-transform outline-none focus:outline-none" /> Unduh Draft
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 outline-none focus:outline-none">
                    <AlertCircle size={24} className="mb-2 opacity-50 outline-none focus:outline-none" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center outline-none focus:outline-none">Belum Tersedia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 outline-none focus:outline-none">
            <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white h-full flex flex-col justify-between relative outline-none focus:outline-none">
              {isLocked && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start gap-4 outline-none focus:outline-none">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500 shrink-0 mt-0.5 outline-none focus:outline-none"><Lock size={20} /></div>
                  <div className="outline-none focus:outline-none">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em] mb-1.5 outline-none focus:outline-none">Penilaian Terkunci</p>
                    <p className="text-xs text-blue-600 font-medium leading-relaxed outline-none focus:outline-none">Anda telah mengirimkan nilai untuk mahasiswa ini. Nilai sudah tersimpan secara permanen di sistem.</p>
                  </div>
                </div>
              )}

              <div className="outline-none focus:outline-none">
                <div className="mb-10 outline-none focus:outline-none">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight outline-none focus:outline-none">Lembar Nilai Sidang</h3>
                  <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:outline-none">
                    <p className="text-slate-600 text-sm font-bold leading-relaxed outline-none focus:outline-none">"{data?.proposal?.judul || "Judul belum tersedia"}"</p>
                  </div>
                </div>

                <div className="mb-8 p-8 border-2 border-slate-100 rounded-[2rem] bg-slate-50/50 outline-none focus:outline-none">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 outline-none focus:outline-none">
                    <Calculator size={14} className="text-blue-50" /> Rincian Nilai Sidang Akhir (0-100)
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 outline-none focus:outline-none">
                    <div className="outline-none focus:outline-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 outline-none focus:outline-none">1. Materi Skripsi</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n1} onChange={(e) => setN1(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all outline-none focus:outline-none ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="outline-none focus:outline-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 outline-none focus:outline-none">2. Orisinalitas & Bobot</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n2} onChange={(e) => setN2(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all outline-none focus:outline-none ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="outline-none focus:outline-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 outline-none focus:outline-none">3. Presentasi & Visual</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n3} onChange={(e) => setN3(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all outline-none focus:outline-none ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="outline-none focus:outline-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 outline-none focus:outline-none">4. Penguasaan Materi</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n4} onChange={(e) => setN4(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all outline-none focus:outline-none ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`} />
                    </div>
                    <div className="md:col-span-2 outline-none focus:outline-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 outline-none focus:outline-none">5. Kemampuan Argumentasi</label>
                      <input type="number" max="100" min="0" step="0.01" required value={n5} onChange={(e) => setN5(e.target.value)} disabled={isLocked} className={`w-full p-3.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all outline-none focus:outline-none ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-800'}`} />
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between outline-none focus:outline-none">
                    <div className="outline-none focus:outline-none">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none focus:outline-none">Rata-Rata Akhir</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-2xl font-black text-blue-600 outline-none focus:outline-none">{nilai ? nilai : "0.00"}</p>
                        <span className="text-lg font-black px-3 py-1 bg-blue-100 text-blue-700 rounded-lg">{hurufMutu}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black tracking-widest uppercase outline-none focus:outline-none">NILAI TOTAL</div>
                  </div>
                </div>
              </div>

              {!isLocked && (
                <button type="submit" disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-900 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 outline-none focus:outline-none focus:ring-0">
                  {submitting ? "MEMPROSES..." : <><Save size={18} className="outline-none focus:outline-none"/> Simpan & Kirim Nilai</>}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}