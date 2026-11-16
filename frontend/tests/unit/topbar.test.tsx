import { render, screen } from "@testing-library/react";
import { TopBar } from "../../components/organisms/TopBar";
import { VIEW_DENGAN_FILTER } from "../../data/view-dengan-filter";

const props = { wilayah: "Semua Wilayah", setWilayah: () => {}, query: "", setQuery: () => {}, pilihan: ["Semua Wilayah"] };

describe("TopBar", () => {
  it("menampilkan bilah (cari, wilayah, periode) hanya bila halaman memakainya", () => {
    const { rerender } = render(<TopBar {...props} tampilFilter />);
    expect(screen.getByPlaceholderText(/Cari/)).toBeInTheDocument();
    expect(screen.getByLabelText("Pilih wilayah")).toBeInTheDocument();
    rerender(<TopBar {...props} tampilFilter={false} />);
    expect(screen.queryByPlaceholderText(/Cari/)).toBeNull();
    expect(screen.queryByLabelText("Pilih wilayah")).toBeNull();
    expect(screen.queryByText("Periode")).toBeNull();
  });
  it("filter hanya untuk halaman yang membacanya: rujukan masuk, antrean, rumah sakit", () => {
    expect(VIEW_DENGAN_FILTER).toEqual(["masuk", "queue", "rumahsakit"]);
  });
});
