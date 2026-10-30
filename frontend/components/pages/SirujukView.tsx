import type { AppNavigation } from "../../hooks/useAppNavigation";
import type { RujukanCase, View } from "../../lib/sirujuk-data";
import { AnalyticsView } from "../organisms/Analytics";
import { AuditView } from "../organisms/AuditView";
import { Dashboard } from "../organisms/Dashboard";
import { Dinkes } from "../organisms/Dinkes";
import { DokterProfil } from "../organisms/DokterProfil";
import { Klarifikasi } from "../organisms/Klarifikasi";
import { ReferralList } from "../organisms/ReferralList";
import { ReviewQueue } from "../organisms/ReviewQueue";
import { SkorBaru } from "../organisms/SkorBaru";
import { ReferralDetailPage } from "./ReferralDetailPage";

interface SirujukViewProps {
  view: View;
  id?: string;
  kasus: RujukanCase | null;
  memuat: boolean;
  nav: AppNavigation;
  wilayah: string;
  query: string;
  onWilayah: (w: string) => void;
}

/** Memilih layar sesuai view dari URL. */
export function SirujukView({ view, id, kasus, memuat, nav, wilayah, query, onWilayah }: SirujukViewProps) {
  switch (view) {
    case "dashboard":
      return <Dashboard go={nav.go} onSelect={nav.lihatDetail} />;
    case "masuk":
      return <ReferralList onSelect={nav.lihatDetail} wilayah={wilayah} query={query} />;
    case "queue":
      return <ReviewQueue onSelect={nav.lihatDetail} wilayah={wilayah} query={query} />;
    case "detail":
      return <ReferralDetailPage kasus={kasus} memuat={memuat} nav={nav} />;
    case "audit":
      return <AuditView kasus={kasus} onDone={nav.keAntrean} onSelect={nav.mulaiAudit} onKlarifikasi={nav.keKlarifikasi} />;
    case "analytics":
      return <AnalyticsView onDokter={nav.keDokter} />;
    case "dokter":
      return <DokterProfil slug={id} onDokter={nav.keDokter} onSelect={nav.lihatDetail} onKlarifikasi={nav.keKlarifikasi} />;
    case "klarifikasi":
      return <Klarifikasi kasus={kasus ?? undefined} onPilih={nav.keKlarifikasi} onDetail={nav.lihatDetail} onDokter={nav.keDokter} />;
    case "skor":
      return <SkorBaru />;
    case "dinkes":
      return (
        <Dinkes
          onWilayah={(w) => {
            onWilayah(w);
            nav.keAntrean();
          }}
        />
      );
    default:
      return null;
  }
}
