/** @jest-environment node */
import { halamanDikenal } from "../../lib/akses";
import { pesan409 } from "../../lib/pesan-galat";
import { validateContent } from "../../lib/validate";
import { mapStored } from "../../services/referral-mapper";
import type { StoredReferral } from "../../types/referral";

describe("pesan409", () => {
  it("memetakan konflik idempotensi dan memberi pesan umum untuk kode lain", () => {
    expect(pesan409("IDEMPOTENCY_CONFLICT")).toMatch(/nomor rujukan baru/i);
    expect(pesan409("KODE_BARU")).toMatch(/final|berubah/i);
    expect(pesan409()).toBe(pesan409("KODE_BARU"));
  });
});

describe("halamanDikenal", () => {
  it("hanya halaman yang ada, sisanya dibiarkan ke 404 Next", () => {
    for (const p of ["/", "/login", "/dashboard", "/referral/r-1", "/klarifikasi"]) expect(halamanDikenal(p)).toBe(true);
    for (const p of ["/tidak-ada", "/dashboardx", "/admin/x"]) expect(halamanDikenal(p)).toBe(false);
  });
});

describe("validateContent", () => {
  it("tidak memeriksa ID, jadi rujukan seed dengan nama faskes berspasi tetap bisa diedit", () => {
    expect(validateContent({ diagnosis_code: "I10", reason: "Alat tidak ada", clinical_narrative: "Nyeri dada" })).toBeNull();
    expect(validateContent({ diagnosis_code: "I10", reason: "", clinical_narrative: "x" })).not.toBeNull();
  });
});

describe("mapStored alasan", () => {
  it("memakai detail dari ML sebagai penjelasan, bukan narasi dokter", () => {
    const item = {
      request: { referral_id: "r-1", patient_name: "", doctor_id: "d", origin_facility_id: "A", destination_facility_id: "B", diagnosis_code: "I10", reason: "ALASAN RUJUKAN", clinical_narrative: "NARASI", issued_at: "2026-10-01T00:00:00Z" },
      decision: { referral_id: "r-1", score: 20, decision: "red", requires_human_review: true, status: "SCORED", signals: { nlp_similarity: 0, anomaly_score: 0, fraud_score: 0 }, reasons: [{ code: "HHI_HIGH_CONCENTRATION", detail: "9 dari 10 rujukan ke satu RS", contribution: 1 }] },
      audits: [],
    } as StoredReferral;
    expect(mapStored(item).alasan).toEqual([{ judul: "Rujukan menumpuk di satu rumah sakit", penjelasan: "9 dari 10 rujukan ke satu RS" }]);
  });
});

describe("proxy GET rujukan dan audit", () => {
  const dir = "../../app/api/v1";
  it("mengekspor GET untuk satu rujukan", async () => {
    const m = await import(`${dir}/referrals/[id]/route`);
    expect(typeof m.GET).toBe("function");
  });
});

describe("klaim ditahan", () => {
  it("hanya TKMKB yang memutuskan: kasus merah atau klaim ditahan untuk verifikator", async () => {
    const { hanyaTkmkb } = await import("../../lib/akses");
    expect(hanyaTkmkb("rendah", "verifikator", "ditahan")).toBe(true);
    expect(hanyaTkmkb("tinggi", "verifikator")).toBe(true);
    expect(hanyaTkmkb("rendah", "verifikator", "normal")).toBe(false);
    expect(hanyaTkmkb("rendah", "tkmkb", "ditahan")).toBe(false);
  });

  it("memetakan 403 backend ke bahasa Indonesia", async () => {
    const { pesan403 } = await import("../../lib/pesan-galat");
    expect(pesan403("FORBIDDEN_ROLE")).toMatch(/TKMKB/);
    expect(pesan403("LAINNYA")).toBeUndefined();
  });
});

describe("api() memetakan pesan galat", () => {
  const galat = (status: number, body: object) =>
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
  afterEach(() => jest.restoreAllMocks());

  it("422 NARRATIVE_UNAVAILABLE jadi Indonesia; kode 422 lain tetap pesan server", async () => {
    const { api } = await import("../../services/api");
    galat(422, { code: "NARRATIVE_UNAVAILABLE", message: "No specific reference narrative for this diagnosis" });
    await expect(api("/x")).rejects.toThrow(/144 diagnosis/);
    jest.restoreAllMocks();
    galat(422, { code: "LAIN", message: "Pesan lain" });
    await expect(api("/x")).rejects.toThrow("Pesan lain");
  });

  it("403 FORBIDDEN_ROLE jadi Indonesia, bukan teks Inggris dari backend", async () => {
    const { api } = await import("../../services/api");
    galat(403, { code: "FORBIDDEN_ROLE", message: "Only TKMKB may make the final decision on a red referral" });
    await expect(api("/x")).rejects.toThrow(/anggota TKMKB/);
  });

  it("403 kode lain dan 400 memakai pesan server; 409 memakai pesan umum", async () => {
    const { api } = await import("../../services/api");
    galat(403, { code: "LAIN", message: "Pesan server" });
    await expect(api("/x")).rejects.toThrow("Pesan server");
    galat(400, { code: "INVALID_REQUEST", message: "Isian salah" });
    await expect(api("/x")).rejects.toThrow("Isian salah");
    galat(409, { code: "APA_SAJA", message: "english" });
    await expect(api("/x")).rejects.toThrow(/Muat ulang/);
  });
});

describe("mapStored nama faskes", () => {
  const dasar = {
    request: { referral_id: "r-1", patient_name: "", doctor_id: "d", origin_facility_id: "F-1", destination_facility_id: "R-1", diagnosis_code: "I10", reason: "x", clinical_narrative: "y", issued_at: "2026-10-01T00:00:00Z" },
    decision: { referral_id: "r-1", score: 1, decision: "green", requires_human_review: false, status: "SCORED", signals: { nlp_similarity: 0, anomaly_score: 0, fraud_score: 0 } },
    audits: [],
  } as unknown as StoredReferral;

  it("memakai nama tampilan bila ada, kalau tidak jatuh ke ID", () => {
    expect(mapStored(dasar).fasalTujuan).toBe("R-1");
    const bernama = { ...dasar, request: { ...dasar.request, origin_facility_name: "Puskesmas Gambir", destination_facility_name: "RSUD Tarakan" } };
    const c = mapStored(bernama);
    expect([c.fasalOrigin, c.fasalTujuan]).toEqual(["Puskesmas Gambir", "RSUD Tarakan"]);
  });
});
