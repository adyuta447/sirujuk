"use client";

import { useRiskConfig } from "../../hooks/useRiskConfig";
import { useSession } from "../../hooks/useSession";
import { ErrorState } from "../atoms/ErrorState";
import { LoadingState } from "../atoms/LoadingState";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { RiskConfigForm } from "./risk-config/RiskConfigForm";

export function RiskConfig() {
  const { data: sesi } = useSession();
  const { data, isLoading, isError, refetch } = useRiskConfig();

  return (
    <PageScroll>
      <PageHead title="Pengaturan Risiko" sub="Batas kategori hijau, kuning, dan merah berlaku untuk seluruh sistem." />
      {isLoading && <LoadingState label="Memuat pengaturan risiko" />}
      {isError && <ErrorState message="Pengaturan risiko gagal dimuat." onRetry={() => refetch()} />}
      {data && <RiskConfigForm konfig={data} bisaUbah={sesi?.role === "tkmkb"} />}
    </PageScroll>
  );
}
