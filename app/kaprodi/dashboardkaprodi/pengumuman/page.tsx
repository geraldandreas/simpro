"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Send, 
  Users, 
  Info,
  Clock,
  XCircle,
  CheckCircle2,
  Edit3, // 🔥 Import icon Edit
  X
} from "lucide-react";
import NotificationBell from '@/components/notificationBell';
import { supabase } from "@/lib/supabaseClient";

export default function PengumumanKaprodiPage() {
  const [target, setTarget] = useState("Semua (Dosen & Mahasiswa)");
  const [judul, setJudul] = useState("");
  const [konten, setKonten] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 🔥 STATE UNTUK MODAL EDIT
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ================= FETCH DATA =================
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false }); 
        
      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.error("Gagal mengambil riwayat", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ================= ACTIONS =================
  const handleBroadcast = async () => {
    if (!judul || !konten) {
      return alert("Harap isi judul dan konten pengumuman.");
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('broadcasts')
        .insert({
          judul: judul,
          konten: konten,
          target_audiens: target,
          is_active: true
        });
      
      if (error) throw error;
      
      alert("✅ Pengumuman berhasil disebarkan!");
      setJudul("");
      setKonten("");
      fetchHistory();
    } catch (error: any) {
      alert("❌ Gagal mengirim pengumuman: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBanner = async (id: string, currentStatus: boolean) => {
    const actionText = currentStatus ? "mematikan" : "mengaktifkan kembali";
    const confirmAction = window.confirm(`Apakah Anda yakin ingin ${actionText} banner pengumuman ini?`);
    if (!confirmAction) return;

    try {
      const { error } = await supabase
        .from('broadcasts')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchHistory(); 
    } catch (error: any) {
      alert(`❌ Gagal ${actionText} banner: ` + error.message);
    }
  };

  // 🔥 FUNGSI BARU: Buka Modal Edit
  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // 🔥 FUNGSI BARU: Simpan Hasil Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);

    try {
      const { error } = await supabase
        .from('broadcasts')
        .update({
          judul: editingItem.judul,
          konten: editingItem.konten,
          target_audiens: editingItem.target_audiens
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      alert("✅ Pengumuman berhasil diperbarui!");
      setIsEditModalOpen(false);
      fetchHistory(); // Refresh riwayat supaya perubahannya muncul
    } catch (err: any) {
      alert("❌ Gagal memperbarui pengumuman: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ================= UI =================
  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative w-72 group"></div>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-6">
              <span className="text-sm font-black tracking-[0.4em] text-blue-600 uppercase border-r border-slate-200 pr-6 mr-2">
                Simpro
              </span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full">
            
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">
                Broadcast Pengumuman
              </h1>
              <p className="text-slate-500 font-medium mt-1 text-sm">
                Kirim informasi penting ke Dosen atau Mahasiswa secara instan.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* LEFT PANEL: FORM */}
              <div className="lg:col-span-5 bg-white rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                    <Megaphone size={20} />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Buat Baru</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audiens</label>
                    <select 
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-inner focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                    >
                      <option value="Semua (Dosen & Mahasiswa)">Semua (Dosen & Mahasiswa)</option>
                      <option value="Dosen Saja">Dosen Saja</option>
                      <option value="Mahasiswa Saja">Mahasiswa Saja</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Pengumuman</label>
                    <input 
                      type="text"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      placeholder="Contoh: Jadwal Sidang Sempro Genap"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none shadow-inner focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konten / Isi</label>
                    <textarea 
                      value={konten}
                      onChange={(e) => setKonten(e.target.value)}
                      placeholder="Tulis detail pengumuman di sini..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none shadow-inner h-40 resize-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={handleBroadcast}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? "Mengirim..." : <><Send size={16} /> Sebarkan Sekarang</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: HISTORY */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3 mb-6 px-2">
                  <Users size={18} className="text-slate-400" />
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Riwayat Broadcast</h3>
                </div>

                <div className="space-y-4">
                  {loadingHistory ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse text-xs tracking-widest uppercase">Memuat Riwayat...</div>
                  ) : history.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50 h-[400px] flex flex-col items-center justify-center text-center p-10">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <Info size={32} />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Belum Ada Pengumuman</p>
                      <p className="text-xs text-slate-400 font-medium max-w-xs">Riwayat pengumuman yang Anda kirimkan akan muncul di sini.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm transition-all relative group ${item.is_active ? 'border-blue-200 shadow-blue-100/50' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                         
                         {/* 🔥 CONTAINER TOMBOL AKSI (Edit & Toggle) */}
                         <div className="absolute top-6 right-6 flex items-center gap-2">
                           {/* Tombol Edit */}
                           <button 
                             onClick={() => handleEditClick(item)}
                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all bg-slate-50 text-slate-500 hover:bg-slate-600 hover:text-white border border-slate-200"
                             title="Edit Pengumuman"
                           >
                             <Edit3 size={12} /> Edit
                           </button>

                           {/* Tombol Aktifkan/Matikan */}
                           <button 
                             onClick={() => handleToggleBanner(item.id, item.is_active)}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                               item.is_active 
                               ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100' 
                               : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100'
                             }`}
                             title={item.is_active ? "Matikan Banner" : "Aktifkan Banner"}
                           >
                             {item.is_active ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                             {item.is_active ? "Matikan" : "Aktifkan Lagi"}
                           </button>
                         </div>

                         <div className="flex justify-between items-start mb-4 pr-[180px]"> {/* pr dilebarkan agar teks tidak nabrak 2 tombol */}
                            <div className="flex gap-2 items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                {item.target_audiens}
                              </span>
                              {item.is_active && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-pulse flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div> Banner Aktif
                                </span>
                              )}
                            </div>
                         </div>
                         <h4 className="font-black text-slate-800 text-base mb-2 uppercase tracking-tight pr-[180px]">{item.judul}</h4>
                         <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.konten}</p>
                         
                         <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-slate-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-bold tracking-tight">{new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })} WIB</span>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL EDIT PENGUMUMAN ================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Edit3 size={18} /></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Edit Pengumuman</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm border border-slate-100">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-8 space-y-6">
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Audiens</label>
                <select 
                  value={editingItem.target_audiens}
                  onChange={(e) => setEditingItem({...editingItem, target_audiens: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-inner"
                >
                  <option value="Semua (Dosen & Mahasiswa)">Semua (Dosen & Mahasiswa)</option>
                  <option value="Dosen Saja">Dosen Saja</option>
                  <option value="Mahasiswa Saja">Mahasiswa Saja</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Judul Pengumuman</label>
                <input 
                  type="text" 
                  value={editingItem.judul}
                  onChange={(e) => setEditingItem({...editingItem, judul: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Konten / Isi</label>
                <textarea 
                  rows={4}
                  value={editingItem.konten}
                  onChange={(e) => setEditingItem({...editingItem, konten: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-inner resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className="px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
                >
                  {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}