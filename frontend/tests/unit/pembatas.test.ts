import { buatPembatas, kunciPercobaan } from "../../lib/auth/pembatas";

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

describe("login limiter key", () => {
  const vercel = { VERCEL: "1" };

  it("separates the same email from different trusted client addresses", () => {
    const dari = (ip: string) => new Headers({ "x-vercel-forwarded-for": ip });
    expect(kunciPercobaan("A@B.id", dari("1.1.1.1"), vercel)).not.toBe(kunciPercobaan("a@b.id", dari("2.2.2.2"), vercel));
    expect(kunciPercobaan("A@B.id", dari("1.1.1.1"), vercel)).toBe(kunciPercobaan("a@b.id", dari("1.1.1.1"), vercel));
  });

  it("does not trust x-vercel-forwarded-for outside Vercel, where a client can set it", () => {
    const dari = (ip: string) => new Headers({ "x-vercel-forwarded-for": ip });
    expect(kunciPercobaan("a@b.id", dari("1.1.1.1"), {})).toBe("a@b.id");
    expect(kunciPercobaan("a@b.id", dari("2.2.2.2"), {})).toBe("a@b.id");
  });

  it("ignores x-forwarded-for, which a client can set freely", () => {
    const palsu = (ip: string) => new Headers({ "x-forwarded-for": ip });
    expect(kunciPercobaan("a@b.id", palsu("9.9.9.9"), vercel)).toBe("a@b.id");
    expect(kunciPercobaan("a@b.id", palsu("8.8.8.8"), vercel)).toBe("a@b.id");
  });
});
