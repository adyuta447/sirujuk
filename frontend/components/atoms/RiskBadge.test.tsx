import { render, screen } from "@testing-library/react";
import { RiskBadge } from "./RiskBadge";

describe("RiskBadge", () => {
  it("exposes the risk label and score to assistive technology", () => {
    render(<RiskBadge level="tinggi" score={91} />);

    expect(screen.getByRole("status", { name: "Risiko Tinggi, skor 91" })).toBeInTheDocument();
    expect(screen.getByText("Risiko Tinggi")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
  });
});
