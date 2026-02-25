"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { markAllAsRead } from '@/lib/notificationUtils';
import { Bell, Circle } from 'lucide-react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Ambil notif awal
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }

      // 2. Langganan Realtime
      const channel = supabase
        .channel('new-notifications')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user.id}` 
          }, 
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setupRealtime();
  }, []);

  // Fungsi untuk membersihkan notifikasi (Hanya yang sudah dibaca)
  const handleClearRead = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 🔥 UBAH: Hapus semua notifikasi milik user ini agar tidak muncul lagi saat ganti page
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  if (!error) {
    // Kosongkan state lokal sepenuhnya
    setNotifications([]);
    setUnreadCount(0);
  } else {
    console.error("Gagal membersihkan database:", error.message);
  }
};
  const handleOpenDropdown = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await markAllAsRead(user.id);
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    }
  };

  return (
    <div className="relative dropdown-container">
      <button 
        onClick={handleOpenDropdown}
        className="relative p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* HEADER DENGAN TOMBOL BERSIHKAN KECIL */}
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 leading-none">
              Pusat Notifikasi
            </h3>
            
            {/* Tombol Bersihkan Kecil */}
            {notifications.some(n => n.is_read) && (
              <button 
                onClick={handleClearRead}
                className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded-lg"
              >
                Bersihkan
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase italic tracking-widest">
                Belum ada kabar terbaru
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <p className="text-[11px] font-black uppercase tracking-tight text-slate-700">
                      {n.title}
                    </p>
                    {!n.is_read && <Circle size={6} className="fill-blue-600 text-blue-600 shrink-0 mt-1" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{n.message}</p>
                  
                  {/* TANGGAL SAJA (JAM DIHAPUS) */}
                  <div className="mt-3">
                    <span className="text-[8px] font-black uppercase tracking-tighter text-slate-300">
                      {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 bg-slate-50/50 text-center" />
        </div>
      )}
    </div>
  );
}