"use client";

import { useAktivitas } from "../../hooks/useAktivitas";
import { Card } from "../atoms/Card";
import { EmptyState } from "../atoms/EmptyState";
import { FilterChip } from "../atoms/FilterChip";
import { PageHead } from "../atoms/PageHead";
import { SecondaryButton } from "../atoms/SecondaryButton";
import { PageScroll } from "../molecules/PageScroll";
import { AktivitasRow } from "./aktivitas/AktivitasRow";

export function Aktivitas() {
  const a = useAktivitas();
  return (
    <PageScroll>
      <PageHead
        title="Aktivitas"
        art="audit"
        sub="Aksi yang Anda lakukan di sesi ini. Tersimpan di browser ini sampai Anda keluar atau menutup tab."
      />
      {a.jumlah.semua === 0 ? (
        <EmptyState art="antrean-kosong" title="Belum ada aktivitas" body="Menyimpan, mengarsipkan, mengaudit, atau menjalankan simulasi akan tercatat di sini." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterChip label="Semua" count={a.jumlah.semua} active={a.filter === "semua"} onClick={() => a.setFilter("semua")} />
              <FilterChip label="Berhasil" count={a.jumlah.berhasil} dotColor="#17803F" active={a.filter === "berhasil"} onClick={() => a.setFilter("berhasil")} />
              <FilterChip label="Gagal" count={a.jumlah.gagal} dotColor="#C42222" active={a.filter === "gagal"} onClick={() => a.setFilter("gagal")} />
            </div>
            <SecondaryButton onClick={a.kosongkan}>Hapus semua</SecondaryButton>
          </div>
          {a.tampak.length === 0 ? (
            <EmptyState art="tidak-ditemukan" title="Tidak ada aktivitas yang cocok" body="Pilih filter lain untuk melihat aktivitas lain." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-[#EEF1F5]">
                {a.tampak.map((x) => (
                  <AktivitasRow key={x.id} aktivitas={x} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </PageScroll>
  );
}
