import { Suspense } from "react";
import DetailProposalMahasiswaClient from "./dasboardmahasiswaclient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
   <DetailProposalMahasiswaClient />
</Suspense>
  );
}
