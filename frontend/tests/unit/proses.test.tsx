import { act, render, screen } from "@testing-library/react";
import { ProsesHost } from "../../components/organisms/ProsesHost";
import { PROSES } from "../../data/proses-dialog";
import { denganProses } from "../../lib/dengan-proses";
import { useProsesStore } from "../../store/useProsesStore";

const tunda = () => {
  let selesai!: (v?: unknown) => void;
  let gagal!: (e: Error) => void;
  const janji = new Promise((res, rej) => ((selesai = res), (gagal = rej)));
  return { janji, selesai, gagal };
};
const maju = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });
// Memulai aksi di dalam act, seperti yang terjadi saat tombol ditekan: React sempat memasang timer sebelum jam dimajukan.
const mulai = async <T,>(kunci: Parameters<typeof denganProses>[0], kerja: () => Promise<T>) => {
  let p!: Promise<T>;
  await act(async () => { p = denganProses(kunci, kerja); });
  return { p }; // dibungkus: mengembalikan promise langsung akan ikut menunggunya selesai
};

beforeEach(() => {
  jest.useFakeTimers();
  useProsesStore.setState({ antrean: [] });
});
afterEach(() => jest.useRealTimers());

describe("denganProses", () => {
  it("mendaftarkan aksi selama berjalan, dan selalu membereskannya, juga saat gagal", async () => {
    const t = tunda();
    const hasil = denganProses("arsip", () => t.janji);
    expect(useProsesStore.getState().antrean).toEqual(["arsip"]);
    t.gagal(new Error("gagal"));
    await expect(hasil).rejects.toThrow("gagal");
    expect(useProsesStore.getState().antrean).toEqual([]);
  });
  it("meneruskan hasilnya", async () => {
    await expect(denganProses("skor", async () => 42)).resolves.toBe(42);
  });
});

describe("ProsesHost", () => {
  it("tidak menampilkan apa pun untuk aksi yang selesai sebelum 250 ms", async () => {
    render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("audit", () => t.janji);
    await maju(200);
    expect(screen.queryByRole("dialog")).toBeNull();
    t.selesai();
    await act(async () => { await p; });
    await maju(1000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("menampilkan ilustrasi, judul besar, dan penjelasan yang sesuai aksinya, lalu menutup setelah selesai", async () => {
    const { container } = render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("arsip", () => t.janji);
    await maju(300);
    const dialog = screen.getByRole("dialog", { name: PROSES.arsip.judul });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(container.ownerDocument.querySelector("img")).toHaveAttribute("src", `/illustrations/${PROSES.arsip.art}.svg`);
    expect(screen.getByText(PROSES.arsip.isi)).toBeInTheDocument();
    t.selesai();
    await act(async () => { await p; });
    await maju(1000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bertahan minimal sebentar setelah muncul supaya tidak berkedip", async () => {
    render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("skor", () => t.janji);
    await maju(300);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    t.selesai();
    await act(async () => { await p; });
    await maju(100);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await maju(600);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("setiap aksi punya ilustrasi dan judul sendiri", () => {
    for (const [kunci, t] of Object.entries(PROSES)) {
      expect(t.judul.length).toBeGreaterThan(5);
      expect(t.art).toBeTruthy();
      expect(kunci).toBeTruthy();
    }
  });
});
