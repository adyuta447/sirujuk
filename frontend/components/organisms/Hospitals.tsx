"use client";

import { Database } from "lucide-react";
import { useState } from "react";
import { useHospitals } from "../../hooks/useHospitals";
import { Card } from "../atoms/Card";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import { LoadingState } from "../atoms/LoadingState";
import { NoticeBanner } from "../atoms/NoticeBanner";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { HospitalListHeader } from "./hospitals/HospitalListHeader";
import { HospitalRow } from "./hospitals/HospitalRow";
import { KindFilter } from "./hospitals/KindFilter";

interface HospitalsProps {
  wilayah: string;
  query: string;
}

export function Hospitals({ wilayah, query }: HospitalsProps) {
  const [kind, setKind] = useState("");
  const { data, isLoading, isError, refetch } = useHospitals(kind, wilayah);
  const q = query.trim().toLowerCase();
  const tampak = (data?.items ?? []).filter((rs) => !q || `${rs.name} ${rs.id}`.toLowerCase().includes(q));
  const demo = data?.items.some((rs) => rs.source.includes("demo"));

  return (
    <PageScroll>
      <PageHead title="Rumah Sakit Tujuan" art="dinkes" sub="Jenis dan spesialisasi faskes yang dipakai untuk menilai kesesuaian tujuan rujukan." />
      {demo && <NoticeBanner Icon={Database}>DIREKTORI DEMO: daftar ini bukan register resmi fasilitas kesehatan.</NoticeBanner>}
      <KindFilter active={kind} onChange={setKind} />
      {isLoading && <LoadingState label="Memuat direktori rumah sakit" />}
      {isError && <ErrorState message="Direktori rumah sakit gagal dimuat." onRetry={() => refetch()} />}
      {data && tampak.length === 0 && <EmptyState title="Tidak ada rumah sakit yang cocok" body="Ubah jenis, wilayah, atau kata pencarian." />}
      {tampak.length > 0 && (
        <Card className="overflow-hidden">
          <HospitalListHeader />
          <ul className="divide-y divide-[#EEF1F5]">
            {tampak.map((rs) => (
              <HospitalRow key={rs.id} rs={rs} />
            ))}
          </ul>
        </Card>
      )}
      {tampak.length > 0 && <p role="status" className="text-xs text-[#64748B] text-center">{tampak.length} rumah sakit</p>}
    </PageScroll>
  );
}
