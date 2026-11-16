"use client";

import { useEffect } from "react";
import { PROSES } from "../../data/proses-dialog";
import { useProsesTampil } from "../../hooks/useProsesTampil";
import { useTutupOtomatis } from "../../hooks/useTutupOtomatis";
import { useAktivitasStore } from "../../store/useAktivitasStore";
import { useProsesStore } from "../../store/useProsesStore";
import { StatusDialog } from "../molecules/StatusDialog";

const BERHASIL_TUTUP_MS = 1800;

/** Dipasang sekali di layout: pop-up untuk aksi yang dibungkus denganProses, dari proses sampai hasilnya. */
export function ProsesHost() {
  const kunci = useProsesTampil();
  const hasil = useProsesStore((s) => s.hasil);
  const tutup = useProsesStore((s) => s.tutupHasil);
  // Memulihkan daftar aktivitas dari sessionStorage sekali, sesudah mount.
  useEffect(() => {
    void useAktivitasStore.persist.rehydrate();
  }, []);
  // Berhasil menutup sendiri begitu terlihat; gagal menunggu pengguna menutupnya.
  useTutupOtomatis(!kunci && hasil?.jenis === "berhasil", BERHASIL_TUTUP_MS, tutup);

  if (kunci) return <StatusDialog jenis="proses" art={PROSES[kunci].art} judul={PROSES[kunci].judul} isi={PROSES[kunci].isi} />;
  if (!hasil) return null;
  const p = PROSES[hasil.kunci];
  if (hasil.jenis === "berhasil" && p.berhasil) {
    return <StatusDialog jenis="berhasil" art="selesai" judul={p.berhasil.judul} isi={p.berhasil.isi} onTutup={tutup} />;
  }
  return hasil.jenis === "gagal" ? <StatusDialog jenis="gagal" art="stat-cek" judul={p.gagal} isi={hasil.pesan} onTutup={tutup} /> : null;
}
