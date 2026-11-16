import type { FilterAktivitas, HalamanAktivitas } from "../types/activity";
import { api } from "./api";

export function getActivity(filter: FilterAktivitas & { cursor?: string; limit?: number }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v) qs.set(k, String(v));
  return api<HalamanAktivitas>(`/activity${qs.size ? `?${qs}` : ""}`);
}
