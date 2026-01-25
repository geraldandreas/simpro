"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, Bell, Check, X, Clock, MessageSquare 
} from 'lucide-react';

// --- TYPES DEFINITIONS ---

interface TimelineStepProps {
  label: string;
  completed?: boolean;
  current?: boolean;
}

interface DocumentItemProps {
  label: string;
  status: 'fail' | 'wait' | 'success';
}

interface ContactCardProps {
  name: string;
  role: string;
  email: string;
  phone: string;
}

// --- MAIN COMPONENT ---

const DashboardMahasiswa: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<boolean>(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;

        const userId = auth.user.id;

        // 1️⃣ cek proposal
        const { data: proposal } = await supabase
          .from("proposals")
          .select("id, status")
          .eq("user_id", userId)
          .maybeSingle();

        if (!proposal) {
          setActiveStep(0);
          return;
        }

        if (proposal.status === "Menunggu Persetujuan Dosbing") {
          setActiveStep(1);
          return;
        }

        if (proposal.status === "Diterima") {

          // 2️⃣ cek bimbingan
          const { data: sessions } = await supabase
            .from("guidance_sessions")
            .select("id")
            .eq("proposal_id", proposal.id);

          if (!sessions || sessions.length === 0) {
            setActiveStep(2);
            return;
          }

          // 3️⃣ cek seminar request
          const { data: seminarReq } = await supabase
            .from("seminar_requests")
            .select("id, status")
            .eq("proposal_id", proposal.id)
            .eq("tipe", "seminar")
            .maybeSingle();

          if (!seminarReq) {
            setActiveStep(3);
            return;
          }

          if (seminarReq.status === "draft") {
            setActiveStep(4);
            return;
          }

          // 4️⃣ cek dokumen seminar
          const { data: docs } = await supabase
            .from("seminar_documents")
            .select("status")
            .eq("proposal_id", proposal.id);

          const hasIncompleteDocs = docs?.some(d =>
            ["Belum Lengkap", "Menunggu Verifikasi"].includes(d.status)
          );

          if (hasIncompleteDocs) {
            setActiveStep(5);
            return;
          }

          const allComplete = docs?.every(d => d.status === "Lengkap");
          if (allComplete) {
            setActiveStep(6);
            return;
          }

          // 5️⃣ cek jadwal seminar
          const { data: schedule } = await supabase
            .from("seminar_schedules")
            .select("id")
            .eq("seminar_request_id", seminarReq.id)
            .maybeSingle();

          if (schedule) {
            setActiveStep(7);
            return;
          }
        }

        setActiveStep(2);
      } catch (err) {
        console.error("Load progress error:", err);
      } finally {
        setLoadingStep(false);
      }
    };

    loadProgress();
  }, []);

  const getStepProps = (index: number) => {
    if (index < activeStep) return { completed: true };
    if (index === activeStep) return { current: true };
    return {};
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-slate-700">
      <Sidebar />

      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-end px-8 sticky top-0 z-20">
          <button className="text-gray-400 hover:text-blue-600 relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500 mb-6">Status Skripsi</p>
          <h2 className="text-xl font-bold text-black mb-10">Dalam Proses Bimbingan</h2>

          {/* TIMELINE PROGRESS */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-50 mb-8 overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-500 mb-12">Linimasa Progres Skripsi</h3>

            {!loadingStep && (
              <div className="relative flex justify-between items-start min-w-[800px]">
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 z-0"></div>

                <div
                  className="absolute top-5 left-0 h-1 bg-emerald-400 z-0 transition-all duration-500"
                  style={{ width: `${(activeStep / 8) * 100}%` }}
                />

                {[
                  "Pengajuan Proposal",
                  "Persetujuan Proposal",
                  "Proses Bimbingan",
                  "Persetujuan Kesiapan Seminar",
                  "Unggah Dokumen Seminar",
                  "Verifikasi Tendik",
                  "Seminar",
                  "Perbaikan Pasca Seminar",
                  "Sidang Skripsi",
                ].map((label, index) => (
                  <TimelineStep
                    key={label}
                    label={label}
                    {...getStepProps(index)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ================= GRID CARDS ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dokumen */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-700 w-full mb-6">Kelengkapan Dokumen Seminar</h3>
              <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset="440" className="text-blue-200" />
                </svg>
                <span className="absolute text-3xl font-bold text-blue-300">0%</span>
              </div>
              <div className="w-full space-y-3">
                <DocumentItem label="Formulir Pengajuan Sidang Tugas Akhir" status="fail" />
                <DocumentItem label="Berita Acara Bimbingan" status="fail" />
                <DocumentItem label="Transkrip Nilai" status="wait" />
                <button className="w-full text-center text-xs text-blue-500 font-semibold mt-4 hover:underline">Lihat Semua</button>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-6">Ringkasan Status</h3>
              <div className="border border-gray-200 rounded-2xl p-6 space-y-6">
                <SummaryRow icon={<FileText size={20} />} label="Jumlah Bimbingan" value="4" />
                <SummaryRow icon={<Bell size={20} className="text-yellow-500" />} label="Revisi Aktif" value="Bimbingan Ke-4" isBadge />
                <SummaryRow icon={<Check size={20} className="text-emerald-500" />} label="Dokumen Lengkap" value="0" />
              </div>
            </div>

            {/* Kontak */}
            <div className="space-y-4">
              <ContactCard name="Dr. Juli Rejito, M.Kom" role="Pembimbing Utama" email="jrejito@unpad.ac.id" phone="087776407095" />
              <ContactCard name="Rudi Rosadi, S.Si, M.Kom" role="Co-Pembimbing" email="r.rosadi@unpad.ac.id" phone="087776407098" />
              <ContactCard name="Bapak Anton" role="Tenaga Kependidikan" email="antonanton@unpad.ac.id" phone="087776407098" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const TimelineStep: React.FC<TimelineStepProps> = ({ label, completed, current }) => (
  <div className="relative z-10 flex flex-col items-center w-20 text-center">
    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
      completed ? 'bg-emerald-400 text-white' : current ? 'bg-yellow-200 border-yellow-100' : 'bg-slate-300 text-transparent'
    }`}>
      {completed && <Check size={20} strokeWidth={3} />}
    </div>
    <span className="mt-4 text-[10px] font-medium leading-tight text-gray-700 uppercase tracking-tighter">
      {label}
    </span>
  </div>
);

const DocumentItem: React.FC<DocumentItemProps> = ({ label, status }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-[10px] font-medium text-gray-600 truncate mr-2">{label}</span>
    {status === 'fail' ? <X size={16} className="text-white bg-red-500 rounded-full p-0.5" /> : 
     status === 'wait' ? <Clock size={16} className="text-gray-400 bg-yellow-100 rounded-full p-0.5" /> : 
     <Check size={16} className="text-emerald-500" />}
  </div>
);

const SummaryRow: React.FC<{ icon: React.ReactNode, label: string, value: string, isBadge?: boolean }> = ({ icon, label, value, isBadge }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
    {isBadge ? (
      <span className="text-[10px] font-medium bg-gray-50 px-3 py-1 rounded-full">{value}</span>
    ) : (
      <span className="font-bold">{value}</span>
    )}
  </div>
);

const ContactCard: React.FC<ContactCardProps> = ({ name, role, email, phone }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
         <div className="w-full h-full bg-slate-300"></div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{name}</p>
        <p className="text-[10px] text-gray-400 uppercase">{role}</p>
      </div>
    </div>
    <div className="space-y-1 mb-4 text-[10px] text-gray-500">
      <p className="flex items-center gap-2">📞 {phone}</p>
      <p className="flex items-center gap-2">✉️ {email}</p>
    </div>
    <div className="flex gap-2">
      <button className="flex-1 py-1.5 bg-blue-700 text-white text-[10px] rounded-md font-semibold flex items-center justify-center gap-1">
        <MessageSquare size={12} /> Pesan
      </button>
      <button className="flex-1 py-1.5 border border-red-400 text-red-500 text-[10px] rounded-md font-semibold flex items-center justify-center gap-1">
        <FileText size={12} /> Email
      </button>
    </div>
  </div>
);

export default DashboardMahasiswa;
