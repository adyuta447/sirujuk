import { fireEvent, render, screen } from "@testing-library/react";
import { Pagination, halamanRingkas } from "../../components/molecules/Pagination";

describe("halamanRingkas", () => {
  it("menampilkan semua nomor bila total <= 7", () => {
    expect(halamanRingkas(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("meringkas dengan elipsis bila total besar", () => {
    const hasil = halamanRingkas(5, 20);
    expect(hasil[0]).toBe(1);
    expect(hasil[hasil.length - 1]).toBe(20);
    expect(hasil).toContain("…");
    expect(hasil).toContain(5);
  });
});

describe("Pagination", () => {
  it("tidak merender apa pun bila hanya satu halaman", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("menonaktifkan tombol batas dan memanggil onChange", () => {
    const onChange = jest.fn();
    render(<Pagination page={1} totalPages={3} onChange={onChange} totalItems={25} pageSize={10} />);
    expect(screen.getByRole("button", { name: "Halaman sebelumnya" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Halaman 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Menampilkan 1–10 dari 25")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Halaman 3" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
