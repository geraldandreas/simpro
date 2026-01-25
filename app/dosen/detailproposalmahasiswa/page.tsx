"use client";

import React from "react";
import Sidebar from "@/components/sidebar-dosen";
import { 
  Search, 
  Bell, 
  User, 
  FileText, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

// --- MOCK DATA ---
const STUDENT_DATA = {
  id: "1",
  name: "Vera Setiawati",
  npm: "140810220013",
  judul: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
  file_name: "Proposal_Skripsi_Vera_Setiawati.pdf",
  file_url: "#"
};

export default function DetailProposalKaprodi() {
  return (
    // ✅ PARENT FLEX
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans text-slate-700">

      {/* ✅ SIDEBAR */}
      <Sidebar />

      {/* ✅ CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">

        {/* --- HEADER --- */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
          <div className="relative w-96">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
              size={20}
            />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
            />
          </div>

          <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
            <Bell size={22} className="text-gray-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-8">
          
          {/* ===== BACK BUTTON & TITLE ===== */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              href="/dosen/aksesproposal" 
              className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </Link>

            <h1 className="text-xl font-bold text-gray-900">
              Detail Proposal Mahasiswa
            </h1>
          </div>

          {/* ===== GRID ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* ==== FULL WIDTH COLUMN ==== */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Card Info Mahasiswa */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                      <User size={40} className="text-gray-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {STUDENT_DATA.name}
                      </h2>
                      <p className="text-gray-500 font-medium mt-1">
                        {STUDENT_DATA.npm}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Bagian Judul */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Judul Proposal
                  </h3>
                  <p className="text-lg font-bold text-gray-800 leading-relaxed">
                    {STUDENT_DATA.judul}
                  </p>
                </div>
              </div>

              {/* Card File Proposal */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  File Proposal Mahasiswa
                </h3>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors bg-white">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                      <FileText size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate pr-4">
                        {STUDENT_DATA.file_name}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        PDF Document
                      </p>
                    </div>
                  </div>
                  
                  <button className="px-6 py-2.5 bg-[#345d8a] text-white text-xs font-bold rounded-lg hover:bg-[#2a4a6e] transition-colors shadow-sm whitespace-nowrap">
                    Lihat PDF
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
