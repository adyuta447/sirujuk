import { FORM_SIMULASI_KOSONG } from "../../data/form-simulasi-kosong";
import { bangunRincianSkor } from "../../lib/rincian-skor";
import { bacaFormKonfig } from "../../lib/risk-config-form";
import { bangunPermintaanSimulasi } from "../../lib/simulate-form";
import { mapStored } from "../../services/referral-mapper";
import type { StoredReferral } from "../../types/referral";

const AKSI = { recommendation: "Periksa", alert: true };
const FORM = { yellow: "50", red: "80", version: 3, actions: { green: AKSI, yellow: AKSI, red: AKSI } };

describe("bacaFormKonfig", () => {
  it("menerima isian sah dan mengirim versi asal", () => {
    expect(bacaFormKonfig(FORM)).toMatchObject({ input: { yellow_from: 50, red_from: 80, version: 3 } });
  });
  it.each([
    [{ ...FORM, yellow: "" }, /angka/],
    [{ ...FORM, yellow: "0" }, /antara 1 dan 100/],
    [{ ...FORM, red: "101" }, /antara 1 dan 100/],
    [{ ...FORM, yellow: "78", red: "80" }, /minimal 5 poin/],
    [{ ...FORM, actions: { ...FORM.actions, red: { recommendation: "  ", alert: true } } }, /Rekomendasi/],
  ])("menolak isian salah %#", (form, pesan) => {
    expect(bacaFormKonfig(form)).toEqual({ galat: expect.stringMatching(pesan) });
  });
});

describe("bangunPermintaanSimulasi", () => {
  const form = (o: object) => ({ ...FORM_SIMULASI_KOSONG, ...o });
  it("tanpa rujukan dasar wajib diagnosis dan alasan", () => {
    expect(bangunPermintaanSimulasi(form({}))).toHaveProperty("galat");
    expect(bangunPermintaanSimulasi(form({ diagnosis: "J06", alasan: "clinical" }))).toHaveProperty("input");
  });
  it("hanya mengirim isian yang diubah, NS dalam persen jadi pecahan, asumsi tujuan terpisah", () => {
    const h = bangunPermintaanSimulasi(form({ baseId: "r-1", ns90: "40", jarak: "15", kompetensi: "tidak", sisrute: "ya" }));
    expect(h).toEqual({ input: { base_referral_id: "r-1", inputs: { ns90: 0.4, sisrute_available: true }, destination: { distance_km: 15, competency: "tidak" } } });
  });
  it("meneruskan RS terdekat dan umur data SISRUTE sebagai masukan model", () => {
    const h = bangunPermintaanSimulasi(form({ baseId: "r-1", umurSisrute: "45", terdekat: "tidak" }));
    expect(h).toEqual({ input: { base_referral_id: "r-1", inputs: { sisrute_age_days: 45, dest_is_nearest: false } } });
    expect(bangunPermintaanSimulasi(form({ baseId: "r-1", umurSisrute: "-1" }))).toHaveProperty("galat");
  });
  it("menolak angka di luar rentang dan ID tidak valid", () => {
    expect(bangunPermintaanSimulasi(form({ baseId: "r-1", ns90: "140" }))).toHaveProperty("galat");
    expect(bangunPermintaanSimulasi(form({ baseId: "a b" }))).toHaveProperty("galat");
  });
});

describe("rincian skor dari backend", () => {
  const stored = (decision: object) => ({
    request: { referral_id: "r-1", patient_name: "", doctor_id: "d", origin_facility_id: "F", destination_facility_id: "R", diagnosis_code: "I10", reason: "x", clinical_narrative: "y", issued_at: "2026-10-01T00:00:00Z" },
    decision: { referral_id: "r-1", score: 90, decision: "red", requires_human_review: true, status: "SCORED", signals: { nlp_similarity: 0, anomaly_score: 0, fraud_score: 0 }, reasons: [{ code: "DUMMY_HIGH", detail: "d", contribution: 1 }], ...decision },
    audits: [],
  }) as unknown as StoredReferral;

  it("memakai persen dan kalimat dari backend apa adanya, hanya faktor positif", () => {
    const r = bangunRincianSkor({ breakdown: { summary: "Merah: skor 90.", basis: "dasar", source: "model", dominant: "hhi", layers: [
      { layer: "hhi", label: "HHI", contribution: 3, share: 62.4 }, { layer: "ns", label: "NS", contribution: 1.8, share: 37.6 }, { layer: "nlp", label: "NLP", contribution: 0, share: 0 } ] } });
    expect(r?.ringkasan).toBe("Merah: skor 90.");
    expect(r?.faktor.map((f) => [f.layer, f.persen])).toEqual([["hhi", 62], ["ns", 38]]);
    expect(bangunRincianSkor({})).toBeUndefined();
  });
  it("skor sementara: kode DUMMY_ tidak pernah menjadi alasan yang tampil", () => {
    const c = mapStored(stored({ signals_source: "backend-dummy" }));
    expect(c.skorDummy).toBe(true);
    expect(c.alasan).toEqual([]);
    expect(mapStored(stored({})).alasan).toHaveLength(1);
  });
});
