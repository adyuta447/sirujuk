import { act, fireEvent, render, screen } from "@testing-library/react";
import { Aktivitas } from "../../components/organisms/Aktivitas";
import { SidebarProfile } from "../../components/organisms/app-shell/SidebarProfile";
import { PROSES } from "../../data/proses-dialog";
import { bolehAkses, PERAN } from "../../lib/akses";
import { denganProses } from "../../lib/dengan-proses";
import { waktuAktivitas } from "../../lib/waktu-aktivitas";
import { useAktivitasStore } from "../../store/useAktivitasStore";
import { useProsesStore } from "../../store/useProsesStore";

const catat = (o: Partial<Parameters<ReturnType<typeof useAktivitasStore.getState>["catat"]>[0]> = {}) =>
  useAktivitasStore.getState().catat({ kunci: "arsip", jenis: "berhasil", judul: "Rujukan diarsipkan", ...o });
const daftar = () => useAktivitasStore.getState().daftar;

beforeEach(() => {
  sessionStorage.clear();
  useAktivitasStore.setState({ daftar: [] });
  useProsesStore.setState({ antrean: [], hasil: null });
});

describe("store aktivitas", () => {
  it("mencatat yang terbaru di depan, belum dibaca, dengan id dan waktu", () => {
    catat({ judul: "Pertama" });
    catat({ judul: "Kedua" });
    expect(daftar().map((a) => a.judul)).toEqual(["Kedua", "Pertama"]);
    expect(daftar().every((a) => !a.dibaca && a.id && !Number.isNaN(Date.parse(a.waktu)))).toBe(true);
    expect(new Set(daftar().map((a) => a.id)).size).toBe(2);
  });
  it("menyimpan paling banyak 100, tandai dibaca, dan kosongkan", () => {
    for (let i = 0; i < 105; i++) catat({ judul: `n${i}` });
    expect(daftar()).toHaveLength(100);
    expect(daftar()[0].judul).toBe("n104");
    useAktivitasStore.getState().tandaiDibaca();
    expect(daftar().every((a) => a.dibaca)).toBe(true);
    useAktivitasStore.getState().kosongkan();
    expect(daftar()).toEqual([]);
  });
});

describe("denganProses mencatat aktivitas", () => {
  it("mencatat berhasil dengan konteksnya, juga untuk aksi tanpa pop-up berhasil", async () => {
    await denganProses("arsip", async () => "ok", "R-001");
    await denganProses("simulasi", async () => "ok");
    expect(daftar().map((a) => [a.judul, a.konteks, a.jenis])).toEqual([
      [PROSES.simulasi.aktivitas, undefined, "berhasil"],
      [PROSES.arsip.aktivitas, "R-001", "berhasil"],
    ]);
  });
  it("mencatat gagal dengan pesan galatnya, dan galat tetap dilempar", async () => {
    await expect(denganProses("ubah", async () => { throw new Error("Rujukan sudah final."); }, "R-002")).rejects.toThrow();
    expect(daftar()[0]).toMatchObject({ jenis: "gagal", judul: PROSES.ubah.gagal, konteks: "R-002", pesan: "Rujukan sudah final." });
  });
});

describe("halaman Aktivitas", () => {
  it("menampilkan keadaan kosong berilustrasi bila belum ada aktivitas", () => {
    render(<Aktivitas />);
    expect(screen.getByText("Belum ada aktivitas")).toBeInTheDocument();
  });
  it("menampilkan baris, memfilter berhasil dan gagal, dan menandai semuanya dibaca", () => {
    catat({ judul: "Rujukan diarsipkan", konteks: "R-001" });
    catat({ jenis: "gagal", judul: "Perubahan gagal disimpan", pesan: "Rujukan sudah final." });
    render(<Aktivitas />);
    expect(screen.getByText("Rujukan diarsipkan")).toBeInTheDocument();
    expect(screen.getByText("R-001")).toBeInTheDocument();
    expect(daftar().every((a) => a.dibaca)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Gagal/ }));
    expect(screen.getByText("Rujukan sudah final.")).toBeInTheDocument();
    expect(screen.queryByText("Rujukan diarsipkan")).toBeNull();
  });
  it("aktivitas baru yang masuk selagi halaman terbuka langsung ditandai dibaca, dan Hapus semua mengosongkan", () => {
    catat();
    render(<Aktivitas />);
    act(() => { catat({ judul: "Baru" }); });
    expect(daftar().every((a) => a.dibaca)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Hapus semua" }));
    expect(screen.getByText("Belum ada aktivitas")).toBeInTheDocument();
  });
});

describe("lonceng di sidebar", () => {
  it("menampilkan jumlah belum dibaca (maksimal 9+) dan membuka halaman aktivitas", () => {
    const buka = jest.fn();
    const { rerender } = render(<SidebarProfile nama="Demo" peran="tkmkb" belumDibaca={0} onAktivitas={buka} />);
    expect(screen.getByRole("button", { name: "Aktivitas" })).toBeInTheDocument();
    rerender(<SidebarProfile nama="Demo" peran="tkmkb" belumDibaca={3} onAktivitas={buka} />);
    fireEvent.click(screen.getByRole("button", { name: "Aktivitas, 3 belum dibaca" }));
    expect(buka).toHaveBeenCalled();
    rerender(<SidebarProfile nama="Demo" peran="tkmkb" belumDibaca={12} onAktivitas={buka} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});

describe("waktu dan akses", () => {
  it("menulis 'Hari ini' untuk hari ini dan tanggal untuk hari lain", () => {
    const sekarang = new Date("2026-11-16T15:00:00");
    expect(waktuAktivitas("2026-11-16T14:03:00", sekarang)).toMatch(/^Hari ini, 14[.:]03$/);
    expect(waktuAktivitas("2026-11-15T09:30:00", sekarang)).toMatch(/^15 Nov(ember)?, 09[.:]30$/);
  });
  it("semua peran boleh membuka halaman aktivitas", () => {
    for (const peran of PERAN) expect(bolehAkses(peran, "/aktivitas")).toBe(true);
  });
});
