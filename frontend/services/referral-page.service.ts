import { PAGE_SIZE } from "../lib/constants";
import type { FilterRujukan, HalamanRujukan } from "../types/referral-page";
import type { StoredReferral } from "../types/referral";
import { api } from "./api";
import { mapStored } from "./referral.service";

type Mentah = Omit<HalamanRujukan, "items"> & { items: StoredReferral[] };

/** Satu halaman rujukan. Kursor dari server dikirim apa adanya (opak), tidak pernah dibentuk di klien. */
export async function getReferralPage(filter: FilterRujukan & { cursor?: string }): Promise<HalamanRujukan> {
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
  for (const [k, v] of Object.entries(filter)) if (v) qs.set(k, v);
  const res = await api<Mentah | StoredReferral[]>(`/referrals?${qs}`);
  // Backend lama mengabaikan limit dan mengirim array polos: lebih baik gagal jelas daripada menampilkan daftar salah.
  if (Array.isArray(res)) throw new Error("Backend belum mendukung paginasi.");
  return { ...res, items: res.items.map(mapStored) };
}
