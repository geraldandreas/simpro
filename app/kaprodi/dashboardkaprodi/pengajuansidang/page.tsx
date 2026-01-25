"use client";

import { Search, Bell } from 'lucide-react';
import Link from "next/link";

export default function PengajuanSidangPage() {
  // Data dummy sesuai screenshot
  const students = [
    {
      id: 1,
      nama: "Vera Setiawati",
      npm: "140810220013",
      judul: "Analisis Sentimen Media Sosial untuk Pemilihan Umum",
      bidang: "AI",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
          <Bell size={20} className="text-gray-400" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="p-8">
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">
            Tetapkan Jadwal Sidang Mahasiswa
          </h1>
        </div>

        {/* --- TABLE CARD --- */}
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden shadow-sm min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5] border-b border-gray-200">
                  <th className="py-4 px-6 text-sm font-bold text-gray-800">Nama Mahasiswa</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-800 text-center">NPM</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-800 w-1/3">Judul</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-800 text-center">Bidang</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-800 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {students.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-6 px-6 text-sm text-gray-900 font-medium align-top">
                      {item.nama}
                    </td>
                    <td className="py-6 px-6 text-sm text-gray-900 font-medium text-center align-top">
                      {item.npm}
                    </td>
                    <td className="py-6 px-6 text-sm text-gray-900 font-medium leading-relaxed align-top">
                      {item.judul}
                    </td>
                    <td className="py-6 px-6 text-sm text-gray-900 font-medium text-center align-top">
                      {item.bidang}
                    </td>
                    <td className="py-5 px-8 text-center align-top">
                      <Link href="/kaprodi/dashboardkaprodi/penjadwalansidang">
                        <button className="bg-[#3b608a] text-white text-sm font-medium rounded-lg hover:bg-blue-1000 transition-colors shadow-sm whitespace-nowrap px-4 py-2">
                          Tetapkan Jadwal Sidang
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty Space Filler */}
          <div className="h-full bg-white"></div>
        </div>

      </main>
    </div>
  );
}
