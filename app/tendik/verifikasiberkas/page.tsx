"use client";

import React, { useState, useEffect } from "react";
import SidebarTendik from "@/components/sidebar-tendik";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Bell,
  MessageSquare,
  MoreHorizontal,
  Eye,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ================= TYPES =================

interface VerificationItem {
  id: string;
  nama_dokumen: string;
  file_url: string;
  status: string;
  created_at: string;

  proposal: {
    user: {
      nama: string;
    } | null;
  } | null;
}

// ================= HELPER =================

const DOC_LABEL: Record<string, string> = {
  berita_acara_bimbingan: "Unggah Berita Acara Bimbingan",
  transkrip_nilai: "Unggah Transkrip Nilai",
  matriks_perbaikan: "Unggah Matriks Perbaikan",
  toefl: "Unggah Sertifikat TOEFL",
  print_jurnal: "Unggah Print Jurnal",
  sertifikat_publikasi: "Unggah Sertifikat Publikasi",
  test_manual: "Unggah Dokumen Manual",
};

// ================= PATH NORMALIZER =================

const normalizeStoragePath = (rawPath: string) => {
  if (!rawPath) return "";

  let clean = rawPath;

  // remove bucket prefix
  clean = clean.replace(/^docseminar\//gi, "");

  // remove invisible chars
  clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  // trim spaces
  clean = clean.trim();

  // normalize slashes
  clean = clean.replace(/\\/g, "/");
  clean = clean.replace(/\/+/g, "/");

  // remove leading slash
  clean = clean.replace(/^\/+/, "");

  return clean;
};

// ================= DEBUG HELPERS =================

const logCharCodes = (label: string, text: string) => {
  console.group(label);
  console.log(text);
  console.log(
    [...text].map((c) => `${c} → ${c.charCodeAt(0)}`).join(" | ")
  );
  console.groupEnd();
};

// ================= PAGE =================

export default function VerifikasiBerkasPage() {
  const [documents, setDocuments] = useState<VerificationItem[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ================= FETCH DATA =================

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("seminar_documents")
        .select(`
          id,
          nama_dokumen,
          file_url,
          status,
          created_at,
          proposal:proposal_id (
            user:user_id (
              nama
            )
          )
        `)
        .eq("status", "Menunggu Verifikasi")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("📦 RAW DB DATA:", data);
      setDocuments(Array.isArray(data) ? (data as VerificationItem[]) : []);
    } catch (err: any) {
      console.error("❌ Gagal mengambil data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // ================= DROPDOWN HANDLER =================

  const toggleDropdown = (id: string) => {
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  useEffect(() => {
    const ensureClose = (event: MouseEvent) => {
      if (
        (event.target as HTMLElement).closest(".action-menu-container") === null
      ) {
        setActiveDropdownId(null);
      }
    };

    document.addEventListener("mousedown", ensureClose);
    return () => document.removeEventListener("mousedown", ensureClose);
  }, []);

  // ================= STORAGE HELPERS =================

  const getSignedUrl = async (rawPath: string) => {
    const normalizedPath = normalizeStoragePath(rawPath);

    console.log("🧪 RAW PATH:");
    logCharCodes("RAW", rawPath);

    console.log("✅ NORMALIZED PATH:");
    logCharCodes("NORMALIZED", normalizedPath);

    // 🔍 EXTRA CHECK — try listing parent folder
    const folder = normalizedPath.split("/")[0];
    console.log("📂 CHECKING FOLDER:", folder);

    const { data: listData, error: listError } = await supabase.storage
      .from("docseminar")
      .list(folder);

    console.log("📂 LIST RESULT:", listData, listError);

    const { data, error } = await supabase.storage
      .from("docseminar")
      .createSignedUrl(normalizedPath, 300);

    if (error || !data?.signedUrl) {
      console.error("🚨 SIGNED URL ERROR:", error);
      throw new Error("Signed URL gagal dibuat");
    }

    return data.signedUrl;
  };

  // ================= ACTION HANDLERS =================

  const handlePreview = async (path: string) => {
    try {
      const signedUrl = await getSignedUrl(path);
      window.open(signedUrl, "_blank");
    } catch {
      alert("❌ Gagal membuka file: File tidak ditemukan di storage");
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const signedUrl = await getSignedUrl(path);

      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = `${filename}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("❌ Gagal download file");
    }
  };

  const handleApprove = async (id: string) => {
    const confirm = window.confirm("Yakin ingin memverifikasi dokumen ini?");
    if (!confirm) return;

    try {
      const { data: auth } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("seminar_documents")
        .update({
          status: "Lengkap",
          verified_at: new Date().toISOString(),
          verified_by: auth?.user?.id || null,
        })
        .eq("id", id);

      if (error) throw error;

      await fetchDocuments();
      setActiveDropdownId(null);
    } catch (err: any) {
      alert("❌ Gagal memverifikasi dokumen");
      console.error(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Masukkan alasan penolakan:");
    if (!reason) return;

    try {
      const { data: auth } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("seminar_documents")
        .update({
          status: "Ditolak",
          verified_at: new Date().toISOString(),
          verified_by: auth?.user?.id || null,
        })
        .eq("id", id);

      if (error) throw error;

      await fetchDocuments();
      setActiveDropdownId(null);
    } catch (err: any) {
      alert("❌ Gagal menolak dokumen");
      console.error(err.message);
    }
  };

  // ================= RENDER =================

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-700">
      <SidebarTendik />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
              size={18}
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-5">
            <MessageSquare size={22} className="text-gray-400" />
            <Bell size={22} className="text-gray-400" />
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-8">
            Verifikasi Berkas Mahasiswa
          </h1>

          <div className="border border-gray-200 rounded-2xl bg-white shadow-sm min-h-[400px]">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Memuat data...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                Tidak ada dokumen untuk diverifikasi.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-8 py-6 text-sm font-bold text-gray-900">
                      Nama
                    </th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-900">
                      File
                    </th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-900">
                      Tanggal
                    </th>
                    <th className="px-8 py-6 text-sm font-bold text-gray-900 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {documents.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-8 py-6 font-semibold text-gray-800">
                        {item.proposal?.user?.nama || "-"}
                      </td>

                      <td className="px-8 py-6 text-gray-700">
                        {DOC_LABEL[item.nama_dokumen] ??
                          item.nama_dokumen}
                      </td>

                      <td className="px-8 py-6 text-gray-700">
                        {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </td>

                      <td className="px-8 py-6 text-right relative action-menu-container">
                        <button
                          onClick={() => toggleDropdown(item.id)}
                          className="p-2 rounded-full text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <MoreHorizontal size={22} />
                        </button>

                        {activeDropdownId === item.id && (
                          <div className="absolute right-8 top-12 w-56 bg-white rounded-xl shadow-xl border z-50">
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() =>
                                  handlePreview(item.file_url)
                                }
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg"
                              >
                                <Eye size={16} />
                                Lihat Dokumen
                              </button>

                              <button
                                onClick={() =>
                                  handleDownload(
                                    item.file_url,
                                    item.nama_dokumen
                                  )
                                }
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                <Download size={16} />
                                Download PDF
                              </button>

                              <button
                                onClick={() => handleApprove(item.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                              >
                                <CheckCircle size={16} />
                                Verifikasi
                              </button>

                              <button
                                onClick={() => handleReject(item.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <XCircle size={16} />
                                Tolak
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="h-20" />
          </div>
        </div>
      </main>
    </div>
  );
}
