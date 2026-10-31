/** @jest-environment node */
import { bangunSegmen } from "../../lib/queue-segments";
import { getReferralPage } from "../../services/referral-page.service";

const stored = (id: string) => ({
  request: { referral_id: id, patient_name: "D*** H***", doctor_id: "d", origin_facility_id: "F", destination_facility_id: "R", diagnosis_code: "I10", reason: "x", clinical_narrative: "y", issued_at: "2026-10-01T00:00:00Z" },
  decision: { referral_id: id, score: 1, decision: "green", requires_human_review: false, status: "SCORED", signals: { nlp_similarity: 0, anomaly_score: 0, fraud_score: 0 } },
  audits: [],
});
const halaman = { items: [stored("r-11")], next: "kursor+/=opak", total: 25, summary: { counts: { red: 3, yellow: 7, green: 15 }, held: 2 } };

describe("getReferralPage", () => {
  afterEach(() => jest.restoreAllMocks());
  const balas = (body: unknown) => jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(body)));
  const urlTerakhir = () => String((global.fetch as jest.Mock).mock.calls[0][0]);

  it("mengirim limit, filter, dan kursor apa adanya (ter-encode), dan nama pasien dari server tidak diubah", async () => {
    balas(halaman);
    const h = await getReferralPage({ wilayah: "Jakarta Utara", risk: "red", q: "i10", cursor: "kursor+/=opak" });
    const qs = new URL(urlTerakhir(), "http://x").searchParams;
    expect(qs.get("limit")).toBe("10");
    expect([qs.get("wilayah"), qs.get("risk"), qs.get("q"), qs.get("cursor")]).toEqual(["Jakarta Utara", "red", "i10", "kursor+/=opak"]);
    expect(h.items[0].pasien).toBe("D*** H***");
    expect(h.next).toBe("kursor+/=opak");
  });

  it("tidak mengirim parameter kosong", async () => {
    balas(halaman);
    await getReferralPage({ wilayah: undefined, q: "" });
    expect(urlTerakhir()).toBe("/api/v1/referrals?limit=10");
  });

  it("gagal jelas bila backend masih mengirim array polos", async () => {
    balas([stored("r-1")]);
    await expect(getReferralPage({})).rejects.toThrow(/paginasi/);
  });
});

describe("bangunSegmen", () => {
  it("memakai ringkasan server, bukan halaman yang dimuat", () => {
    const s = bangunSegmen(halaman.summary);
    expect(s.map((x) => [x.key, x.count])).toEqual([["semua", 25], ["ditahan", 2], ["tinggi", 3], ["sedang", 7], ["rendah", 15]]);
    expect(bangunSegmen(undefined).every((x) => x.count === 0)).toBe(true);
  });
});
