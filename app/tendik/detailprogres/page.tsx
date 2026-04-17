import { Suspense } from "react";
import DetailProgresTendikClient from "./detailprogrestendikclient"; // Pastikan path ini sesuai nama file client.tsx Anda

export const dynamic = "force-dynamic";

export default function DetailProgresTendikPage() {
  return (
    <Suspense fallback={
              <div className="flex h-screen items-center justify-center bg-[#F8F9FB] z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            }>
              <DetailProgresTendikClient />
            </Suspense>
          );
        }