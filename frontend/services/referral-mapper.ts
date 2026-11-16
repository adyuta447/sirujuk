import type { RujukanCase } from "../lib/sirujuk-data";
import { namaDokter } from "../lib/sirujuk-data";
import type { StoredReferral } from "../types/referral";
import { RISK_DARI_KEPUTUSAN } from "../data/risk-dari-keputusan";
import { KODE_ALASAN } from "../lib/alasan-skor";
import { bangunIndikator } from "../lib/indikator";
import { bangunRincianSkor } from "../lib/rincian-skor";

/** Rujukan dari backend → bentuk tampilan. Kategori dan angka apa adanya dari keputusan backend. */
export function mapStored(item: StoredReferral): RujukanCase {
  const { request, decision } = item;
  const audits = item.audits ?? [];
  const id = request.referral_id;
  const risk = RISK_DARI_KEPUTUSAN[decision.decision] ?? "sedang";
  const score = Math.round(decision.score);
  // Judul dari kode alasan, penjelasan dari detail yang ditulis ML untuk kasus ini (bukan narasi dokter).
  const reasons = (decision.reasons ?? []).map((r) => ({
    judul: KODE_ALASAN[r.code] ?? r.code,
    penjelasan: r.detail,
  }));
  return {
    id,
    noRujukan: id.toUpperCase(),
    pasien: request.patient_name,
    // Usia dan jenis peserta belum ada di backend; tidak dikarang.
    fasalOrigin: request.origin_facility_name || request.origin_facility_id,
    fasalTujuan: request.destination_facility_name || request.destination_facility_id,
    wilayah: request.origin_wilayah || "Tidak diketahui", // sama dengan label backend /stats
    diagnosa: request.diagnosis_code,
    dokter: namaDokter(request.doctor_id),
    tanggal: new Date(request.issued_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    risk,
    riskScore: score,
    // Skor sementara (mesin cadangan) tidak punya alasan sungguhan: kode DUMMY_ tidak boleh tampil mentah.
    alasan: risk === "rendah" || decision.signals_source === "backend-dummy" ? [] : reasons,
    // Selesai hanya bila final. Hasil perlu-klarifikasi sudah ada audit tetapi belum final.
    status: item.final
      ? "selesai"
      : audits.length > 0
        ? "sedang-diaudit"
        : "menunggu",
    claimStatus: item.claim_status,
    synthetic: item.synthetic,
    sumber: item.source,
    skorDummy: decision.signals_source === "backend-dummy",
    indikator: bangunIndikator(decision),
    kodeAlasan: decision.reason_codes?.join(", "),
    rincianSkor: bangunRincianSkor(decision),
    narasi: request.clinical_narrative,
    alasanRujukan: request.reason,
    riwayatSkor: (item.history ?? []).map((h) => ({
      skor: Math.round(h.score),
      tanggal: h.scored_at,
      versiModel: h.model_version,
    })),
    klarifikasi: (item.clarifications ?? []).map((c) => ({
      penulis: c.author,
      teks: c.text,
      tanggal: c.at,
    })),
  };
}
