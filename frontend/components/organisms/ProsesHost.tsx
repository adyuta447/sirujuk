"use client";

import { PROSES } from "../../data/proses-dialog";
import { useProsesTampil } from "../../hooks/useProsesTampil";
import { ProcessDialog } from "../molecules/ProcessDialog";

/** Dipasang sekali di layout: menampilkan pop-up untuk aksi apa pun yang dibungkus denganProses. */
export function ProsesHost() {
  const kunci = useProsesTampil();
  return kunci ? <ProcessDialog tampilan={PROSES[kunci]} /> : null;
}
