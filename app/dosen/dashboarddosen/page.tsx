"use client";

import React from "react";
import Sidebar from "@/components/sidebar-dosen"; // Pastikan path import sesuai struktur folder Anda
import { Search, Bell, MessageSquare } from "lucide-react";

// --- MOCK DATA ---
const STATS = [
  { 
    count: 5, 
    label: "Mahasiswa Bimbingan", 
    desc: "Mahasiswa Bimbingan" // Redundan di visual, tapi untuk struktur data
  },
  { 
    count: 4, 
    label: "Proposal Menunggu Persetujuan",
    desc: "Proposal Menunggu Persetujuan"
  },
  { 
    count: 1, 
    label: "Menunggu Persetujuan Seminar",
    desc: "Menunggu Persetujuan Seminar"
  }
];

const STUDENTS = [
  {
    name: "Gerald Christopher Andreas",
    npm: "140810220014",
    status: "Proses Kesiapan Seminar",
    pembimbing2: "Dr. Juli Rejito, M.Kom"
  },
  {
    name: "Vera Setiawati",
    npm: "140810220013",
    status: "Pengajuan Proposal",
    pembimbing2: "-"
  },
  {
    name: "Dobi Nugraha",
    npm: "140810220012",
    status: "Proses Bimbingan",
    pembimbing2: "Rudi Rosadi, M.Kom"
  }
];

export default function DashboardPage() {
  
  // Helper untuk warna badge status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Proses Kesiapan Seminar":
        return "bg-[#8CAEE3] text-white"; // Biru Pucat
      case "Pengajuan Proposal":
        return "bg-[#E6CF95] text-white"; // Kuning/Gold Pucat
      case "Proses Bimbingan":
        return "bg-[#AEC0BA] text-white"; // Abu-abu Kehijauan
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8">
          {/* Search Bar */}
          <div className="relative w-96">
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-gray-400"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          {/* Icons */}
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-gray-600">
              <MessageSquare size={22} />
            </button>
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell size={22} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="flex-1 p-8 bg-white">
          
          {/* Welcome Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Selamat Datang, Dr. Asep Sholahuddin, MT.
          </h1>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {STATS.map((stat, idx) => (
              <div key={idx} className="border border-gray-300 rounded-2xl p-8 flex flex-col justify-center items-center text-center h-48 hover:shadow-sm transition-shadow">
                <span className="text-4xl font-extrabold text-gray-900 mb-4">{stat.count}</span>
                <span className="text-base font-semibold text-gray-900 max-w-[150px] leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* TABLE SECTION */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Mahasiswa Bimbingan</h2>
            
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-gray-200 text-left">
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Nama Mahasiswa</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">NPM</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Status</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">Pembimbing 2</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {STUDENTS.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-6 text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-900">
                        {student.npm}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${getStatusBadgeStyle(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-900">
                        {student.pembimbing2}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button className="bg-[#6AA495] hover:bg-[#588d7f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}