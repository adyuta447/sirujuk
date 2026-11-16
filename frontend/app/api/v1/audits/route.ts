import { keBackendSebagai, tolak, wajibPetugas, wajibTingkat } from "../../../../lib/auth/guard";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;
const JEJAK = { resource: "audit", action: "create" } as const;
const OUTCOME = ["valid", "tidak-valid", "perlu-klarifikasi"];

export async function POST(request: Request) {
  const cek = await wajibPetugas(request, true, JEJAK);
  if ("galat" in cek) return cek.galat;

  const mentah = await request.text();
  if (mentah.length > 8 * 1024) return tolak(cek.sesi, JEJAK, 413, "PAYLOAD_TOO_LARGE", "Permintaan terlalu besar");
  let b: { referral_id?: unknown; outcome?: unknown; note?: unknown };
  try {
    b = JSON.parse(mentah);
  } catch {
    return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid");
  }
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (typeof b.referral_id !== "string" || !SAFE_ID.test(b.referral_id) || typeof b.outcome !== "string" || !OUTCOME.includes(b.outcome) || !note || note.length > 2000) {
    return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid", typeof b.referral_id === "string" ? b.referral_id : undefined);
  }
  // Merah hanya untuk TKMKB (dicek dari skor tersimpan di backend, bukan dari klien). Meminta klarifikasi dokter
  // boleh untuk verifikator di semua tingkat: sesuai kontrak dan backend, dan tidak memutuskan klaim.
  if (b.outcome !== "perlu-klarifikasi") {
    const ditolak = await wajibTingkat(cek.sesi, b.referral_id, JEJAK);
    if (ditolak) return ditolak;
  }
  // Pemeriksa diambil dari sesi, bukan dari body, supaya tidak bisa dipalsukan.
  return keBackendSebagai(cek.sesi, "/api/v1/audits", {
    method: "POST",
    body: JSON.stringify({ referral_id: b.referral_id, outcome: b.outcome, note, reviewer: cek.sesi.nama }),
  });
}
