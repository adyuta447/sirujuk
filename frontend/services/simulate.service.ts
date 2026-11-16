import type { HasilSimulasi, PermintaanSimulasi } from "../types/simulate";
import { ApiError, api } from "./api";

export async function simulate(input: PermintaanSimulasi): Promise<HasilSimulasi> {
  try {
    return await api<HasilSimulasi>("/simulate", { method: "POST", body: JSON.stringify(input) });
  } catch (e) {
    // Backend menolak menebak: tanpa model ML tidak ada hasil. Pesan 5xx dari api() terlalu umum untuk ini.
    if (e instanceof ApiError && (e.status === 502 || e.status === 503)) {
      throw new ApiError("Simulator membutuhkan model ML yang saat ini tidak tersedia. Tidak ada yang disimulasikan.", e.status, e.code);
    }
    throw e;
  }
}
