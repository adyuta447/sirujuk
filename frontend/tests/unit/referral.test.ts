import { mapStored } from "../../services/referral.service";
import type { StoredReferral } from "../../types/referral";

const item = (decision: string, score: number): StoredReferral => ({
  request: {
    referral_id: "r-001",
    patient_name: "",
    doctor_id: "d-1",
    origin_facility_id: "F-1",
    destination_facility_id: "R-1",
    diagnosis_code: "I10",
    reason: "Keterbatasan alat",
    clinical_narrative: "",
    issued_at: "2026-10-01T00:00:00Z",
  },
  decision: {
    referral_id: "r-001",
    score,
    decision: decision as "red",
    requires_human_review: true,
    status: "SCORED",
    signals: { nlp_similarity: 0, anomaly_score: 0, fraud_score: 0 },
    reasons: [{ code: "NARRATIVE_GENERIC", detail: "Narasi terlalu umum", contribution: 1 }],
  },
  audits: [],
});

describe("mapStored", () => {
  it("takes the risk category only from the backend decision, not from score thresholds", () => {
    expect(mapStored(item("green", 99)).risk).toBe("rendah");
    expect(mapStored(item("yellow", 1)).risk).toBe("sedang");
    expect(mapStored(item("red", 1)).risk).toBe("tinggi");
  });

  it("does not invent age, participant type or region", () => {
    const c = mapStored(item("yellow", 14));
    expect(c.usia).toBeUndefined();
    expect(c.jenisPeserta).toBeUndefined();
    expect(c.wilayah).toBe("Belum tercatat");
  });
});

describe("mapStored status", () => {
  const audit = { reviewer: "A", outcome: "perlu-klarifikasi", note: "x", reviewed_at: "2026-10-01T00:00:00Z" };
  it("is selesai only when the backend marks the case final", () => {
    expect(mapStored({ ...item("yellow", 1), audits: [audit], final: false }).status).toBe("sedang-diaudit");
    expect(mapStored({ ...item("yellow", 1), audits: [audit], final: true }).status).toBe("selesai");
    expect(mapStored(item("yellow", 1)).status).toBe("menunggu");
  });
  it("passes the claim status through", () => {
    expect(mapStored({ ...item("red", 1), claim_status: "ditahan" }).claimStatus).toBe("ditahan");
  });
});

import { bangunIndikator } from "../../lib/indikator";

describe("bangunIndikator", () => {
  it("reads the exact numbers from decision.indicators and flags unknown facility distance", () => {
    const d = {
      ...item("yellow", 14).decision,
      reason_codes: ["NS_ABOVE_PEER_P95"],
      indicators: {
        ns: { value: 0.42, peer_p95: 0.21, n: 63, min_n: 20, applies: true },
        hhi: { value: 4820, n: 90, min_n: 30, observe_from: 1500, high_from: 2500, nearest_known: false },
        sisrute: { flag: false, age_days: 47, weight: 0.4 },
        narrative: { similarity: 0.31, p10: 0.62, mapped: true },
      },
    };
    const [ns, hhi] = bangunIndikator(d);
    expect(ns.nilai).toBe("42%");
    expect(ns.banding).toContain("21%");
    expect(ns.level).toBe("tinggi");
    expect(hhi.level).toBe("tinggi");
    expect(hhi.banding).toContain("Jarak faskes belum diketahui");
  });

  it("does not crash when the narrative was not scored (similarity null)", () => {
    const d = {
      ...item("green", 1).decision,
      reason_codes: ["NARRATIVE_UNAVAILABLE"],
      indicators: {
        ns: { value: null, peer_p95: 0.21, n: 3, min_n: 20, applies: false },
        hhi: { value: null, n: 3, min_n: 30, observe_from: 1500, high_from: 2500, nearest_known: false },
        sisrute: { flag: false, age_days: 0, weight: 1 },
        narrative: { similarity: null, p10: 0.62, mapped: false },
      },
    };
    expect(bangunIndikator(d)[3].nilai).toBe("Tidak dinilai");
  });
});

import { opsiWilayah } from "../../lib/formatters";

describe("opsiWilayah", () => {
  const semua = "Semua Wilayah";
  it("builds the region filter from real data, sorted, without the unknown bucket", () => {
    const daftar = [{ wilayah: "Jakarta Utara" }, { wilayah: "Belum tercatat" }, { wilayah: "Bandung" }, { wilayah: "Jakarta Utara" }];
    expect(opsiWilayah(daftar, semua, semua)).toEqual([semua, "Bandung", "Jakarta Utara"]);
  });
  it("keeps the active choice even before the data has loaded", () => {
    expect(opsiWilayah([], "Surabaya", semua)).toEqual([semua, "Surabaya"]);
  });
});
