import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState } from "../../components/atoms/EmptyState";
import { ErrorState } from "../../components/atoms/ErrorState";
import { LoadingState } from "../../components/atoms/LoadingState";

describe("LoadingState", () => {
  it("announces what is loading to assistive technology", () => {
    render(<LoadingState label="Memuat antrean rujukan" />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat antrean rujukan");
  });
});

describe("EmptyState", () => {
  it("names the cause and the next action", () => {
    render(
      <EmptyState
        art="antrean-kosong"
        title="Tidak ada rujukan di antrean ini"
        body="Pilih kategori lain untuk melihat rujukan lain."
      />,
    );
    expect(
      screen.getByText("Tidak ada rujukan di antrean ini"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pilih kategori lain untuk melihat rujukan lain."),
    ).toBeInTheDocument();
  });
});

describe("EmptyState layout", () => {
  it("menaruh ilustrasi lebih dulu, lalu judul, penjelasan, dan langkah berikutnya", () => {
    const { container } = render(
      <EmptyState art="tidak-ditemukan" title="Judul" body="Penjelasan">
        <button type="button">Langkah</button>
      </EmptyState>,
    );
    const urut = Array.from(container.querySelectorAll("img, p, button")).map((el) => el.tagName + (el.textContent ?? ""));
    expect(urut).toEqual(["IMG", "PJudul", "PPenjelasan", "BUTTONLangkah"]);
    expect(container.querySelector("img")).toHaveAttribute("src", "/illustrations/tidak-ditemukan.svg");
  });
  it("tetap berilustrasi saat dipakai di dalam kartu lain", () => {
    const { container } = render(<EmptyState embedded art="selesai" title="Kosong" />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("states the failure and offers a working retry", () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Antrean belum bisa dimuat." onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Antrean belum bisa dimuat.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
