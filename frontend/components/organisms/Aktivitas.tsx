"use client";

import { useAktivitas } from "../../hooks/useAktivitas";
import { useSession } from "../../hooks/useSession";
import { Card } from "../atoms/Card";
import { EmptyState } from "../atoms/EmptyState";
import { ErrorState } from "../atoms/ErrorState";
import { LoadingState } from "../atoms/LoadingState";
import { PageHead } from "../atoms/PageHead";
import { SecondaryButton } from "../atoms/SecondaryButton";
import { PageScroll } from "../molecules/PageScroll";
import { AktivitasFilter } from "./aktivitas/AktivitasFilter";
import { AktivitasRow } from "./aktivitas/AktivitasRow";

export function Aktivitas() {
  const { data: sesi } = useSession();
  const a = useAktivitas();
  const semua = sesi?.role === "tkmkb"; // ditentukan backend dari sesi; ini hanya untuk teks dan kolom pelaku
  const kosong = !a.isLoading && !a.isError && a.items.length === 0;

  return (
    <PageScroll>
      <PageHead
        title="Aktivitas"
        art="audit"
        sub={semua ? "Aksi semua pengguna di sistem, dicatat oleh server." : "Aksi yang dilakukan lewat akun Anda, dicatat oleh server."}
      />
      <AktivitasFilter a={a} />
      {a.isLoading && <LoadingState label="Memuat aktivitas" />}
      {a.belumTersedia && <EmptyState art="tidak-ditemukan" title="Log aktivitas belum tersedia" body="Server ini belum menyediakan log aktivitas. Hubungi pengelola sistem." />}
      {a.isError && !a.belumTersedia && <ErrorState message="Aktivitas gagal dimuat." onRetry={a.ulangi} />}
      {kosong && <EmptyState art="antrean-kosong" title="Belum ada aktivitas" body="Aksi yang tercatat, atau yang cocok dengan filter, akan tampil di sini." />}
      {a.items.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[#EEF1F5]">
            {a.items.map((e) => (
              <AktivitasRow key={e.id} entri={e} tampilkanPelaku={semua} />
            ))}
          </ul>
        </Card>
      )}
      {a.adaLanjut && (
        <div className="flex justify-center">
          <SecondaryButton onClick={a.muatLagi} disabled={a.memuatLagi}>
            {a.memuatLagi ? "Memuat…" : "Muat lebih banyak"}
          </SecondaryButton>
        </div>
      )}
    </PageScroll>
  );
}
