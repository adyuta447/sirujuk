import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, LoadingState } from "../../components/atoms/States";

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
