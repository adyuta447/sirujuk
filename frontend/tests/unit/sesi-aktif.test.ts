/** @jest-environment node */
import { sesiMasihAktif } from "../../lib/auth/sesi-aktif";

const sesi = { sub: "a@b.id", nama: "A", role: "dokter" as const, exp: 0, sid: "s".repeat(20) };

describe("sesiMasihAktif", () => {
  afterEach(() => jest.restoreAllMocks());
  const balas = (status: number) => jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status }));

  it.each([[204, true], [401, false], [403, false], [404, false], [503, true]])("status %i -> %s", async (status, aktif) => {
    balas(status);
    expect(await sesiMasihAktif(sesi)).toBe(aktif);
  });

  it("tetap aktif bila backend tak terjangkau", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("down"));
    expect(await sesiMasihAktif(sesi)).toBe(true);
  });
});
