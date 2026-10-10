import { renderHook } from "@testing-library/react";
import { useAuditQueue } from "../../hooks/useAuditQueue";
import type { RujukanCase } from "../../lib/sirujuk-data";

const make = (
  id: string,
  risk: RujukanCase["risk"],
  riskScore: number,
  wilayah: string,
): RujukanCase =>
  ({
    id,
    noRujukan: `RJK-${id}`,
    pasien: `Pasien ${id}`,
    usia: 40,
    jenisPeserta: "PBI",
    fasalOrigin: "Puskesmas A",
    fasalTujuan: "RS B",
    wilayah,
    diagnosa: "I10",
    dokter: "dr. X",
    tanggal: "1 Agustus 2024",
    risk,
    riskScore,
    alasan: [],
    status: "menunggu",
    indikator: [],
  }) as RujukanCase;

const referrals = [
  make("1", "rendah", 32, "Jakarta Utara"),
  make("2", "tinggi", 84, "Jakarta Barat"),
  make("3", "tinggi", 91, "Jakarta Utara"),
  make("4", "sedang", 67, "Jakarta Barat"),
];

describe("useAuditQueue", () => {
  it("sorts highest risk and score first", () => {
    const { result } = renderHook(() =>
      useAuditQueue(referrals, "Semua Wilayah", "semua"),
    );
    expect(result.current.base.map((c) => c.id)).toEqual(["3", "2", "4", "1"]);
  });

  it("filters by region", () => {
    const { result } = renderHook(() =>
      useAuditQueue(referrals, "Jakarta Utara", "semua"),
    );
    expect(result.current.base.map((c) => c.id)).toEqual(["3", "1"]);
  });

  it("filters by risk level", () => {
    const { result } = renderHook(() =>
      useAuditQueue(referrals, "Semua Wilayah", "tinggi"),
    );
    expect(result.current.filtered.map((c) => c.id)).toEqual(["3", "2"]);
  });

  it("counts each risk level across the region", () => {
    const { result } = renderHook(() =>
      useAuditQueue(referrals, "Semua Wilayah", "semua"),
    );
    expect(result.current.counts).toEqual({ tinggi: 2, sedang: 1, rendah: 1 });
  });

  it("handles a missing referral list", () => {
    const { result } = renderHook(() =>
      useAuditQueue(undefined, "Semua Wilayah", "semua"),
    );
    expect(result.current.base).toEqual([]);
    expect(result.current.counts).toEqual({ tinggi: 0, sedang: 0, rendah: 0 });
  });
});
