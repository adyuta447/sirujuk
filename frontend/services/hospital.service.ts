import type { DaftarRs, HasilKesesuaian } from "../types/hospital";
import { api } from "./api";

export const getDestinationFit = (id: string, jarakKm?: string) =>
  api<HasilKesesuaian>(`/referrals/${encodeURIComponent(id)}/destination-fit${jarakKm ? `?distance_km=${encodeURIComponent(jarakKm)}` : ""}`);

export function getHospitals(kind: string, wilayah: string) {
  const qs = new URLSearchParams();
  if (kind) qs.set("kind", kind);
  if (wilayah) qs.set("wilayah", wilayah);
  return api<DaftarRs>(`/hospitals${qs.size ? `?${qs}` : ""}`);
}
