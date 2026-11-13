"use client";

import { History, TrendingUp } from "lucide-react";
import { hanyaTkmkb } from "../../lib/akses";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { useAccordion } from "../../hooks/useAccordion";
import { useSession } from "../../hooks/useSession";
import { AccordionSection } from "../molecules/AccordionSection";
import { PageScroll } from "../molecules/PageScroll";
import { DetailActionBar } from "./referral-detail/DetailActionBar";
import { DetailBreadcrumb } from "./referral-detail/DetailBreadcrumb";
import { DetailHeader } from "./referral-detail/DetailHeader";
import { DoctorNarrative } from "./referral-detail/DoctorNarrative";
import { ReasonsCard } from "./referral-detail/ReasonsCard";
import { ScoreBreakdown } from "./referral-detail/ScoreBreakdown";
import { ScoreHistory } from "./referral-detail/ScoreHistory";
import { ReferralActions } from "./ReferralActions";

interface ReferralDetailProps {
  kasus: RujukanCase;
  onBack: () => void;
  onAudit: (k: RujukanCase) => void;
  onDokter: (nama: string) => void;
  onKlarifikasi: (k: RujukanCase) => void;
}

export function ReferralDetail({ kasus, onBack, onAudit, onDokter, onKlarifikasi }: ReferralDetailProps) {
  const { data: sesi } = useSession();
  const { open, toggle } = useAccordion<string>("pola");
  const adaIndikator = !!kasus.indikator && kasus.indikator.length > 0;

  return (
    <PageScroll spacing="space-y-4">
      <DetailBreadcrumb noRujukan={kasus.noRujukan} onBack={onBack} />
      <DetailHeader kasus={kasus} onDokter={onDokter} />
      <ReasonsCard kasus={kasus} />
      <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] pt-1">Data pendukung</div>
      {adaIndikator && (
        <AccordionSection title="Rincian Skor (4 Indikator)" Icon={TrendingUp} open={open === "pola"} onToggle={() => toggle("pola")}>
          <ScoreBreakdown kasus={kasus} />
        </AccordionSection>
      )}
      <AccordionSection title="Narasi Dokter" Icon={History} open={open === "narasi"} onToggle={() => toggle("narasi")}>
        <DoctorNarrative kasus={kasus} />
      </AccordionSection>
      {kasus.riwayatSkor && kasus.riwayatSkor.length > 0 && (
        <AccordionSection title="Skor Sebelumnya" Icon={History} open={open === "skor-lama"} onToggle={() => toggle("skor-lama")}>
          <ScoreHistory riwayat={kasus.riwayatSkor} />
        </AccordionSection>
      )}
      {kasus.narasi !== undefined && <ReferralActions kasus={kasus} onArchived={onBack} />}
      {kasus.status !== "selesai" && (
        <DetailActionBar
          kasus={kasus}
          hanyaTkmkb={hanyaTkmkb(kasus.risk, sesi?.role)}
          onAudit={onAudit}
          onKlarifikasi={onKlarifikasi}
        />
      )}
    </PageScroll>
  );
}
