import { fireEvent, render, screen } from "@testing-library/react";
import { Dinkes } from "../../components/organisms/Dinkes";
import { useStatsSumber, useWilayahStats } from "../../hooks/useStats";

jest.mock("../../hooks/useStats", () => ({
  useStatsSumber: jest.fn(),
  useWilayahStats: jest.fn(),
}));

const mockWilayah = useWilayahStats as jest.Mock;
const mockSumber = useStatsSumber as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSumber.mockReturnValue({ data: null });
});

describe("Dinkes", () => {
  it("menyebut apa yang dimuat saat loading", () => {
    mockWilayah.mockReturnValue({ data: [], isError: false, isLoading: true, refetch: jest.fn() });
    render(<Dinkes onWilayah={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat data wilayah");
  });

  it("tawaran coba-lagi memanggil refetch saat error", () => {
    const refetch = jest.fn();
    mockWilayah.mockReturnValue({ data: [], isError: true, isLoading: false, refetch });
    render(<Dinkes onWilayah={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("menyebut sebab dan ekspektasi pengisi saat kosong", () => {
    mockWilayah.mockReturnValue({ data: [], isError: false, isLoading: false, refetch: jest.fn() });
    render(<Dinkes onWilayah={() => {}} />);
    expect(screen.getByText(/Belum ada rujukan yang dinilai/)).toBeInTheDocument();
  });

  it("menaruh Perlu dicek sebelum angka lain dan memanggil onWilayah", () => {
    mockWilayah.mockReturnValue({
      data: [{ wilayah: "Jakarta Utara", faskes: 12, rujukan: 140, persenTinggi: 27, medianNS: 18, hhiRata: 1650 }],
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
    const onWilayah = jest.fn();
    render(<Dinkes onWilayah={onWilayah} />);
    const istilah = screen.getAllByText(/Perlu dicek|Rujukan|Faskes/).map((el) => el.textContent);
    expect(istilah[0]).toBe("Perlu dicek");
    fireEvent.click(screen.getByRole("button", { name: /Jakarta Utara/ }));
    expect(onWilayah).toHaveBeenCalledWith("Jakarta Utara");
  });

  it("menaruh wilayah dengan Perlu dicek tertinggi paling atas", () => {
    mockWilayah.mockReturnValue({
      data: [
        { wilayah: "Jakarta Barat", faskes: 8, rujukan: 60, persenTinggi: 12, medianNS: 10, hhiRata: 1400 },
        { wilayah: "Jakarta Utara", faskes: 12, rujukan: 140, persenTinggi: 27, medianNS: 18, hhiRata: 1650 },
      ],
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<Dinkes onWilayah={() => {}} />);
    const kartu = screen.getAllByRole("button", { name: /Jakarta/ });
    expect(kartu[0]).toHaveAccessibleName(/Jakarta Utara/);
    expect(kartu[1]).toHaveAccessibleName(/Jakarta Barat/);
  });

  it("menandai data sampel BPJS sebagai historis, bukan sintetis", () => {
    mockSumber.mockReturnValue({ data: "bpjs-sampel-2025" });
    mockWilayah.mockReturnValue({ data: [], isError: false, isLoading: false, refetch: jest.fn() });
    render(<Dinkes onWilayah={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent("DATA SAMPEL BPJS");
    expect(screen.getByRole("note")).not.toHaveTextContent("SINTETIS");
  });
});
