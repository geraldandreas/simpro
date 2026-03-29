import { Suspense } from "react";
import DetailProposalMahasiswaClient from "./detailbimbinganmahasiswaclient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
   <DetailProposalMahasiswaClient />
</Suspense>
  );
}
