import { bangunKartuAnalitik } from "../../lib/kartu-analitik";
import { bangunKartuPencegahan } from "../../lib/kartu-pencegahan";
import { bangunKartuStat } from "../../lib/kartu-stat";
import type { Pencegahan } from "../../types/prevention";

describe("kartu statistik", () => {
  it("kartu Analitik memakai ilustrasi dan ikon yang sama dengan padanannya di Beranda", () => {
    const beranda = bangunKartuStat({ total: 30, perluDicek: 5, menunggu: 5, selesai: 0 } as never, false);
    const analitik = bangunKartuAnalitik({ total: 30, perluDicek: 5, sudahDicek: 0, menunggu: 5 } as never);
    const art = (daftar: { label: string; art: string }[], label: string) => daftar.find((k) => k.label === label)?.art;
    expect(art(analitik, "Total rujukan")).toBe(art(beranda, "Rujukan masuk"));
    expect(art(analitik, "Perlu dicek")).toBe(art(beranda, "Perlu dicek"));
    expect(art(analitik, "Menunggu")).toBe(art(beranda, "Masih mengantre"));
    expect(art(analitik, "Sudah dicek")).toBe(art(beranda, "Selesai dicek"));
  });
  it("persen dan angka mengikuti format Indonesia", () => {
    const k = bangunKartuAnalitik({ total: 30, perluDicek: 5, sudahDicek: 0, menunggu: 25 } as never);
    expect(k[1].sub).toBe("16,7% dari total");
  });
  it("kartu pencegahan membawa angka backend apa adanya", () => {
    const p = { total: 200, kns_total: 64, kns_percent: 32, kns_flagged: 21, kns_confirmed_invalid: 3 } as Pencegahan;
    expect(bangunKartuPencegahan(p).map((k) => k.val)).toEqual(["64", "21", "3"]);
    expect(bangunKartuPencegahan(p)[0].sub).toBe("32% dari 200 rujukan dinilai");
  });
});
