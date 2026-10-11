import { buatPembatas } from "../../lib/auth/pembatas";

describe("login limiter", () => {
  it("blocks a key after the allowed number of failures", () => {
    const p = buatPembatas(3, 60_000, 100);
    for (let i = 0; i < 3; i++) p.catatGagal("a@b.id");
    expect(p.tertahan("a@b.id")).toBe(true);
    expect(p.tertahan("lain@b.id")).toBe(false);
  });

  it("keeps an existing block when an attacker floods it with other keys", () => {
    const p = buatPembatas(3, 60_000, 50);
    for (let i = 0; i < 3; i++) p.catatGagal("korban@b.id");
    for (let i = 0; i < 500; i++) p.catatGagal(`penyerang${i}@b.id`);
    expect(p.tertahan("korban@b.id")).toBe(true);
  });

  it("forgets a key after a successful login", () => {
    const p = buatPembatas(2, 60_000, 10);
    p.catatGagal("a@b.id");
    p.catatGagal("a@b.id");
    p.hapus("a@b.id");
    expect(p.tertahan("a@b.id")).toBe(false);
  });
});
