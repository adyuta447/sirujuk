import { act, fireEvent, render, screen } from "@testing-library/react";
import { ProsesHost } from "../../components/organisms/ProsesHost";
import { PROSES } from "../../data/proses-dialog";
import { denganProses } from "../../lib/dengan-proses";
import { pesanGalat } from "../../lib/pesan-galat";
import { useProsesStore } from "../../store/useProsesStore";

const tunda = () => {
  let selesai!: (v?: unknown) => void;
  let gagal!: (e: Error) => void;
  const janji = new Promise((res, rej) => ((selesai = res), (gagal = rej)));
  return { janji, selesai, gagal };
};
const maju = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });
// Memulai aksi di dalam act, seperti saat tombol ditekan: React sempat memasang timer sebelum jam dimajukan.
const mulai = async <T,>(kunci: Parameters<typeof denganProses>[0], kerja: () => Promise<T>) => {
  let p!: Promise<T>;
  await act(async () => { p = denganProses(kunci, kerja); p.catch(() => undefined); }); // galat yang disengaja bukan "unhandled"
  return { p }; // dibungkus: mengembalikan promise langsung akan ikut menunggunya selesai
};
const selesaikan = async (p: Promise<unknown>) => { await act(async () => { await p.catch(() => undefined); }); };

beforeEach(() => {
  jest.useFakeTimers();
  useProsesStore.setState({ antrean: [], hasil: null });
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

describe("ProsesHost: sedang diproses", () => {
  it("tidak menampilkan apa pun untuk aksi tanpa pesan berhasil yang selesai sebelum 250 ms", async () => {
    render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("simulasi", () => t.janji);
    await maju(200);
    expect(screen.queryByRole("dialog")).toBeNull();
    t.selesai();
    await selesaikan(p);
    await maju(1000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("menampilkan ilustrasi, judul besar, dan penjelasan yang sesuai aksinya", async () => {
    const { container } = render(<ProsesHost />);
    const t = tunda();
    await mulai("arsip", () => t.janji);
    await maju(300);
    const dialog = screen.getByRole("dialog", { name: PROSES.arsip.judul });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(container.ownerDocument.querySelector("img")).toHaveAttribute("src", `/illustrations/${PROSES.arsip.art}.svg`);
    expect(screen.getByText(PROSES.arsip.isi)).toBeInTheDocument();
  });

  it("bertahan minimal sebentar setelah muncul supaya tidak berkedip", async () => {
    render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("simulasi", () => t.janji);
    await maju(300);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    t.selesai();
    await selesaikan(p);
    await maju(100);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await maju(600);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ProsesHost: berhasil", () => {
  it("setelah proses, pop-up berganti menjadi berhasil lalu menutup sendiri", async () => {
    const { container } = render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("arsip", () => t.janji);
    await maju(300);
    t.selesai();
    await selesaikan(p);
    await maju(700);
    const dialog = screen.getByRole("dialog", { name: PROSES.arsip.berhasil?.judul });
    expect(dialog).toHaveAttribute("aria-busy", "false");
    expect(container.ownerDocument.querySelector("img")).toHaveAttribute("src", "/illustrations/selesai.svg");
    await maju(2000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("aksi cepat langsung menampilkan berhasil tanpa pop-up proses", async () => {
    render(<ProsesHost />);
    const { p } = await mulai("ubah", async () => "ok");
    await selesaikan(p);
    expect(screen.getByRole("dialog", { name: PROSES.ubah.berhasil?.judul })).toBeInTheDocument();
  });

  it("bisa ditutup dengan Escape", async () => {
    render(<ProsesHost />);
    const { p } = await mulai("pengaturan", async () => "ok");
    await selesaikan(p);
    await act(async () => { fireEvent.keyDown(window, { key: "Escape" }); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ProsesHost: gagal", () => {
  it("menampilkan pesan galatnya, tidak menutup sendiri, dan hilang saat Tutup ditekan", async () => {
    const { container } = render(<ProsesHost />);
    const t = tunda();
    const { p } = await mulai("arsip", () => t.janji);
    await maju(300);
    t.gagal(new Error("Rujukan sudah final."));
    await selesaikan(p);
    await maju(700);
    const dialog = screen.getByRole("alertdialog", { name: PROSES.arsip.gagal });
    expect(dialog).toHaveTextContent("Rujukan sudah final.");
    expect(container.ownerDocument.querySelector("img")).toHaveAttribute("src", "/illustrations/stat-cek.svg");
    await maju(10000);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tutup" })); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("aksi tanpa pesan berhasil (simulasi) tetap menampilkan galatnya, dan galat tetap dilempar", async () => {
    render(<ProsesHost />);
    const { p } = await mulai("simulasi", async () => { throw new Error("Model tidak tersedia."); });
    await expect(p).rejects.toThrow("Model tidak tersedia.");
    expect(screen.getByRole("alertdialog", { name: PROSES.simulasi.gagal })).toHaveTextContent("Model tidak tersedia.");
  });

  it("aksi baru menggantikan hasil lama yang masih terbuka", async () => {
    render(<ProsesHost />);
    const a = await mulai("arsip", async () => { throw new Error("x"); });
    await selesaikan(a.p);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    const t = tunda();
    await mulai("skor", () => t.janji);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("pesanGalat", () => {
  it("memakai pesan galat, dan mengubah galat jaringan menjadi kalimat Indonesia", () => {
    expect(pesanGalat(new Error("Rujukan sudah final."))).toBe("Rujukan sudah final.");
    expect(pesanGalat(new TypeError("Failed to fetch"))).toMatch(/Tidak dapat terhubung ke server/);
    expect(pesanGalat("aneh")).toBe("Terjadi kesalahan. Silakan coba lagi.");
  });
});

describe("PROSES", () => {
  it("setiap aksi punya judul, ilustrasi, dan judul gagal; simulasi dan dampak tidak punya pesan berhasil", () => {
    for (const t of Object.values(PROSES)) {
      expect(t.judul.length).toBeGreaterThan(5);
      expect(t.art).toBeTruthy();
      expect(t.gagal).toMatch(/gagal/i);
    }
    expect(PROSES.simulasi.berhasil).toBeUndefined();
    expect(PROSES.dampak.berhasil).toBeUndefined();
  });
});
