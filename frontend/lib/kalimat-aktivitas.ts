import { KALIMAT_AKTIVITAS } from "../data/kalimat-aktivitas";
import type { EntriAktivitas } from "../types/activity";

export const kalimatAktivitas = (e: Pick<EntriAktivitas, "resource" | "action">): string =>
  KALIMAT_AKTIVITAS[`${e.resource}.${e.action}`] ?? `${e.action} ${e.resource}`;
