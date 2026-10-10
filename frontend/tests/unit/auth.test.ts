/** @jest-environment node */
import { bolehAkses, bolehSkor } from "../../lib/akses";
import { bacaToken, buatToken } from "../../lib/auth/token";
import { buatHash } from "../../lib/auth/users";

const RAHASIA = "x".repeat(40);
const sesi = (over = {}) => ({ sub: "a@b.id", nama: "A", role: "verifikator" as const, exp: Math.floor(Date.now() / 1000) + 60, ...over });

describe("token sesi", () => {
  it("round-trips a valid session", async () => {
    const t = await buatToken(sesi(), RAHASIA);
    expect((await bacaToken(t, RAHASIA))?.role).toBe("verifikator");
  });
  it("rejects a tampered payload (role escalation)", async () => {
    const t = await buatToken(sesi(), RAHASIA);
    const [, tanda] = t.split(".");
    const palsu = Buffer.from(JSON.stringify(sesi({ role: "tkmkb" }))).toString("base64url");
    expect(await bacaToken(`${palsu}.${tanda}`, RAHASIA)).toBeNull();
  });
  it("rejects a wrong secret, expired token, and garbage", async () => {
    const t = await buatToken(sesi(), RAHASIA);
    expect(await bacaToken(t, "y".repeat(40))).toBeNull();
    expect(await bacaToken(await buatToken(sesi({ exp: 1 }), RAHASIA), RAHASIA)).toBeNull();
    expect(await bacaToken("bukan-token", RAHASIA)).toBeNull();
    expect(await bacaToken("a.b.c", RAHASIA)).toBeNull();
  });
});

describe("akses per peran", () => {
  it("keeps doctors out of the officer pages", () => {
    expect(bolehAkses("dokter", "/klarifikasi/1")).toBe(true);
    expect(bolehAkses("dokter", "/dashboard")).toBe(false);
    expect(bolehAkses("dokter", "/audit/1")).toBe(false);
  });
  it("limits Dinkes to the regional view and denies unknown paths", () => {
    expect(bolehAkses("dinkes", "/dinkes")).toBe(true);
    expect(bolehAkses("dinkes", "/queue")).toBe(false);
    expect(bolehAkses("verifikator", "/tidak-ada")).toBe(false);
  });
  it("only officers may call scoring", () => {
    expect(bolehSkor("verifikator")).toBe(true);
    expect(bolehSkor("dokter")).toBe(false);
    expect(bolehSkor("dinkes")).toBe(false);
  });
});

describe("hash kata sandi", () => {
  it("uses a random salt per hash", async () => {
    expect(await buatHash("rahasia-panjang-123")).not.toBe(await buatHash("rahasia-panjang-123"));
  });
});
