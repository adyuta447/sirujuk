import { bacaLogin } from "../../lib/auth/baca-login";
import { buatPembatas } from "../../lib/auth/pembatas";

describe("buatPembatas", () => {
  afterEach(() => jest.restoreAllMocks());

  it("menahan kunci setelah mencapai batas dan melepasnya saat dibersihkan", () => {
    const p = buatPembatas({ batas: 2, jendelaMs: 1000 });
    p.catatGagal("a@x.id");
    expect(p.tertahan("a@x.id")).toBe(false);
    p.catatGagal("a@x.id");
    expect(p.tertahan("a@x.id")).toBe(true);
    expect(p.tertahan("b@x.id")).toBe(false);
    p.bersihkan("a@x.id");
    expect(p.tertahan("a@x.id")).toBe(false);
  });

  it("melepas otomatis setelah jendela lewat dan melaporkan sisa detik minimal 1", () => {
    const sekarang = jest.spyOn(Date, "now").mockReturnValue(0);
    const p = buatPembatas({ batas: 1, jendelaMs: 1500 });
    p.catatGagal("k");
    expect(p.sisaDetik("k")).toBe(2);
    sekarang.mockReturnValue(1499);
    expect(p.sisaDetik("k")).toBe(1);
    sekarang.mockReturnValue(1501);
    expect(p.tertahan("k")).toBe(false);
  });
});

describe("bacaLogin", () => {
  it("memangkas email dan membatasi panjang", () => {
    expect(bacaLogin(JSON.stringify({ email: "  a@x.id ", sandi: "x".repeat(300) }))).toEqual({
      email: "a@x.id",
      sandi: "x".repeat(200),
    });
  });

  it("memberi string kosong untuk tipe salah dan null untuk JSON rusak", () => {
    expect(bacaLogin(JSON.stringify({ email: 1 }))).toEqual({ email: "", sandi: "" });
    expect(bacaLogin("{rusak")).toBeNull();
    expect(bacaLogin("null")).toBeNull();
  });
});
