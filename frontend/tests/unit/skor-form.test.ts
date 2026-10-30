import { bacaInputSkor } from "../../lib/skor-form";

function formDari(isi: Record<string, string>) {
  const f = new FormData();
  Object.entries(isi).forEach(([k, v]) => f.set(k, v));
  return f;
}

const LENGKAP = {
  referral_no: " RJK-1 ",
  doctor_id: "d-001",
  origin_facility_id: "fktp-001",
  destination_facility_id: "fkrtl-001",
  diagnosis_code: "I10",
  reason: "equipment",
  clinical_narrative: "",
};

describe("bacaInputSkor", () => {
  it("memangkas spasi dan memetakan kategori alasan ke teks", () => {
    expect(bacaInputSkor(formDari(LENGKAP))).toMatchObject({
      referral_no: "RJK-1",
      reason: "Keterbatasan alat",
      reason_category: "equipment",
      clinical_narrative: "",
    });
  });

  it("menolak kolom wajib kosong", () => {
    expect(bacaInputSkor(formDari({ ...LENGKAP, doctor_id: "  " }))).toBeNull();
  });

  it("menolak alasan yang bukan salah satu pilihan", () => {
    expect(bacaInputSkor(formDari({ ...LENGKAP, reason: "lainnya" }))).toBeNull();
  });
});
