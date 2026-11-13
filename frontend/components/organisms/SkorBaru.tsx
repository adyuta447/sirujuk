"use client";

import { useScoreForm } from "../../hooks/useScoreForm";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { ScoreForm } from "./skor-baru/ScoreForm";
import { ScoreResult } from "./skor-baru/ScoreResult";

export function SkorBaru() {
  const score = useScoreForm();

  return (
    <PageScroll>
      <PageHead
        title="Skor Rujukan"
        sub="Kirim satu rujukan ke sistem skoring dan lihat hasilnya."
        art="analitik"
      />
      <p
        role="note"
        className="rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white"
      >
        Uji coba: rujukan diisi manual oleh petugas. Belum terhubung ke P-Care
        atau V-Claim, jadi ini belum titik penerbitan rujukan yang sebenarnya.
      </p>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem] gap-5 items-start">
        <ScoreForm
          onSubmit={score.kirim}
          kosong={score.kosong}
          isPending={score.isPending}
        />
        <ScoreResult
          data={score.data}
          error={score.error}
          isPending={score.isPending}
          level={score.level}
          onReset={score.reset}
        />
      </div>
    </PageScroll>
  );
}
