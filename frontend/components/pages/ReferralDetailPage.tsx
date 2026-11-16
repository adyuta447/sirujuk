import type { AppNavigation } from "../../hooks/useAppNavigation";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { EmptyState } from "../atoms/EmptyState";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { PageScroll } from "../molecules/PageScroll";
import { ReferralDetail } from "../organisms/ReferralDetail";

interface ReferralDetailPageProps {
  kasus: RujukanCase | null;
  memuat: boolean;
  nav: AppNavigation;
}

export function ReferralDetailPage({ kasus, memuat, nav }: ReferralDetailPageProps) {
  if (kasus) {
    return (
      <ReferralDetail
        kasus={kasus}
        onBack={nav.keAntrean}
        onAudit={nav.mulaiAudit}
        onDokter={nav.keDokter}
        onKlarifikasi={nav.keKlarifikasi}
      />
    );
  }
  if (memuat) return <p className="p-6 text-sm">Memuat rujukan…</p>;
  return (
    <PageScroll>
      <EmptyState art="tidak-ditemukan" title="Rujukan tidak ditemukan" body="Rujukan mungkin sudah diarsipkan atau alamatnya salah.">
        <PrimaryButton onClick={nav.keAntrean} className="px-5 py-3">Kembali ke antrean</PrimaryButton>
      </EmptyState>
    </PageScroll>
  );
}
