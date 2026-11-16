import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Aktivitas } from "../../components/organisms/Aktivitas";
import { AktivitasRow } from "../../components/organisms/aktivitas/AktivitasRow";
import { useAktivitasBelumDibaca } from "../../hooks/useAktivitasBelumDibaca";
import { kalimatAktivitas } from "../../lib/kalimat-aktivitas";
import { ApiError } from "../../services/api";
import { getActivity } from "../../services/activity.service";
import { useAktivitasDilihat } from "../../store/useAktivitasDilihat";
import type { EntriAktivitas } from "../../types/activity";

jest.mock("../../services/activity.service", () => ({ getActivity: jest.fn() }));
let mockRole = "tkmkb";
jest.mock("../../hooks/useSession", () => ({ useSession: () => ({ data: { nama: "N", role: mockRole } }) }));
const ambil = getActivity as jest.Mock;

const E = (o: Partial<EntriAktivitas> = {}): EntriAktivitas => ({
  id: "i" + Math.random(), at: "2026-11-16T13:00:00.000Z", actor: "tkmkb@demo.sirujuk.id", role: "tkmkb",
  action: "update", resource: "referral", resource_id: "r-1", outcome: "ok", status: 200, ...o,
});
const klien = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const bungkus = (c = klien()) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={c}>{children}</QueryClientProvider>;

beforeEach(() => {
  ambil.mockReset();
  mockRole = "tkmkb";
  useAktivitasDilihat.setState({ dilihat: null });
});

describe("kalimatAktivitas", () => {
  it("memetakan pasangan resource dan aksi, dan jatuh ke teks apa adanya bila belum dikenal", () => {
    expect(kalimatAktivitas({ resource: "referral", action: "delete" })).toBe("Mengarsipkan rujukan");
    expect(kalimatAktivitas({ resource: "session", action: "login" })).toBe("Masuk");
    expect(kalimatAktivitas({ resource: "baru", action: "ekspor" })).toBe("ekspor baru");
  });
});

describe("AktivitasRow", () => {
  it("menampilkan hasil bukan-ok dengan labelnya, nomor rujukan huruf besar, dan pelaku hanya bila diminta", () => {
    const { rerender } = render(<ul><AktivitasRow entri={E({ outcome: "denied", status: 403 })} tampilkanPelaku /></ul>);
    expect(screen.getByText("Tidak diizinkan")).toBeInTheDocument();
    expect(screen.getByText("R-1")).toBeInTheDocument();
    expect(screen.getByText(/tkmkb@demo.sirujuk.id · Anggota TKMKB/)).toBeInTheDocument();
    rerender(<ul><AktivitasRow entri={E()} tampilkanPelaku={false} /></ul>);
    expect(screen.queryByText(/tkmkb@demo/)).toBeNull();
    expect(screen.queryByText("Berhasil")).toBeNull();
  });
  it("login gagal tanpa email tampil sebagai 'Belum masuk'", () => {
    render(<ul><AktivitasRow entri={E({ actor: "", role: "", resource: "session", action: "login", resource_id: undefined, outcome: "denied" })} tampilkanPelaku /></ul>);
    expect(screen.getByText("Belum masuk")).toBeInTheDocument();
  });
  it("menampilkan teks dari server sebagai teks biasa, tidak pernah sebagai HTML", () => {
    const { container } = render(<ul><AktivitasRow entri={E({ detail: ['<img src=x onerror="alert(1)">', "reason"] })} tampilkanPelaku={false} /></ul>);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x onerror="alert\(1\)"> · reason/)).toBeInTheDocument();
  });
});

describe("halaman Aktivitas", () => {
  it("menampilkan baris dan pelaku untuk TKMKB, dan memuat halaman berikutnya dengan kursor dari server", async () => {
    ambil.mockResolvedValueOnce({ items: [E({ id: "a", resource_id: "r-1" })], next: "kursor-1" });
    ambil.mockResolvedValueOnce({ items: [E({ id: "b", resource_id: "r-2" })], next: "" });
    render(<Aktivitas />, { wrapper: bungkus() });
    expect(await screen.findByText("R-1")).toBeInTheDocument();
    expect(screen.getByText(/Aksi semua pengguna/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Muat lebih banyak" }));
    expect(await screen.findByText("R-2")).toBeInTheDocument();
    expect(ambil).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "kursor-1" }));
    expect(screen.queryByRole("button", { name: "Muat lebih banyak" })).toBeNull();
  });
  it("peran lain tidak melihat kolom pelaku dan mendapat teks 'akun Anda'", async () => {
    mockRole = "dokter";
    ambil.mockResolvedValue({ items: [E()], next: "" });
    render(<Aktivitas />, { wrapper: bungkus() });
    expect(await screen.findByText("R-1")).toBeInTheDocument();
    expect(screen.getByText(/lewat akun Anda/)).toBeInTheDocument();
    expect(screen.queryByText(/tkmkb@demo/)).toBeNull();
  });
  it("filter hasil mengirim outcome ke server", async () => {
    ambil.mockResolvedValue({ items: [], next: "" });
    render(<Aktivitas />, { wrapper: bungkus() });
    await screen.findByText("Belum ada aktivitas");
    fireEvent.click(screen.getByRole("button", { name: "Ditolak" }));
    await waitFor(() => expect(ambil).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "rejected" })));
  });
  it("backend yang belum punya endpoint-nya (404) tampil sebagai 'belum tersedia', bukan galat umum", async () => {
    ambil.mockRejectedValue(new ApiError("x", 404));
    render(<Aktivitas />, { wrapper: bungkus() });
    expect(await screen.findByText("Log aktivitas belum tersedia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
  });
  it("galat lain menawarkan coba lagi", async () => {
    ambil.mockRejectedValue(new ApiError("x", 500));
    render(<Aktivitas />, { wrapper: bungkus() });
    expect(await screen.findByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
  it("membuka daftar tanpa filter menandai yang terbaru sudah dilihat", async () => {
    ambil.mockResolvedValue({ items: [E({ at: "2026-11-16T13:30:00.000Z" })], next: "" });
    render(<Aktivitas />, { wrapper: bungkus() });
    await screen.findByText("R-1");
    expect(useAktivitasDilihat.getState().dilihat).toBe("2026-11-16T13:30:00.000Z");
  });
});

describe("useAktivitasBelumDibaca", () => {
  it("entri yang sudah ada saat dibuka tidak dihitung; sesudahnya hanya yang ditolak atau gagal", async () => {
    const klienIni = klien();
    ambil.mockResolvedValueOnce({ items: [E({ at: "2026-11-16T13:00:00.000Z", outcome: "failed" })], next: "" });
    const { result } = renderHook(() => useAktivitasBelumDibaca(), { wrapper: bungkus(klienIni) });
    await waitFor(() => expect(useAktivitasDilihat.getState().dilihat).toBe("2026-11-16T13:00:00.000Z"));
    expect(result.current).toBe(0);
    ambil.mockResolvedValueOnce({
      items: [
        E({ at: "2026-11-16T13:05:00.000Z", outcome: "ok" }),
        E({ at: "2026-11-16T13:04:00.000Z", outcome: "denied", status: 403 }),
        E({ at: "2026-11-16T13:03:00.000Z", outcome: "failed", status: 500 }),
        E({ at: "2026-11-16T13:00:00.000Z", outcome: "failed" }),
      ],
      next: "",
    });
    await act(async () => { await klienIni.invalidateQueries({ queryKey: ["activity", "terbaru"] }); });
    await waitFor(() => expect(result.current).toBe(2));
  });
});
