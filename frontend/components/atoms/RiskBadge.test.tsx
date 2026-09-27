import { render, screen } from "@testing-library/react";
import { RiskBadge } from "./RiskBadge";

describe("RiskBadge", () => {
  it("exposes the risk label and score to assistive technology", () => {
    render(<RiskBadge level="tinggi" score={91} />);

    expect(screen.getByRole("status", { name: "Perlu Dicek, skor 91" })).toBeInTheDocument();
    expect(screen.getByText("Perlu Dicek")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
  });
});
