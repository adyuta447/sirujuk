import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CostEstimate } from "../../components/organisms/analytics/CostEstimate";
import { RiskConfigForm } from "../../components/organisms/risk-config/RiskConfigForm";
import { SimulationResult } from "../../components/organisms/simulation/SimulationResult";
import type { KonfigRisiko } from "../../types/risk-config";
import type { HasilSimulasi } from "../../types/simulate";

const AKSI = { recommendation: "Periksa", alert: true };
const KONFIG: KonfigRisiko = {
  yellow_from: 50, red_from: 80, actions: { green: AKSI, yellow: AKSI, red: AKSI }, version: 1,
  updated_by: "tkmkb@demo", source: "configured", model_reference: { yellow_from: 50, red_from: 80 },
};
const bungkus = (node: ReactNode) => <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>;

describe("RiskConfigForm", () => {
  it("peran selain TKMKB hanya melihat: kolom terkunci, tanpa tombol simpan", () => {
    render(bungkus(<RiskConfigForm konfig={KONFIG} bisaUbah={false} />));
    expect(screen.getByLabelText("Kuning mulai dari skor")).toBeDisabled();
    expect(screen.getByText(/Hanya anggota TKMKB/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simpan pengaturan" })).toBeNull();
  });
  it("TKMKB tidak bisa menyimpan sebelum melihat dampak", () => {
    render(bungkus(<RiskConfigForm konfig={KONFIG} bisaUbah />));
    expect(screen.getByRole("button", { name: "Simpan pengaturan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lihat dampak" })).toBeEnabled();
  });
});

describe("CostEstimate", () => {
  it("menyebut estimasi dan asumsi, bukan penghematan aktual", () => {
    render(<CostEstimate biaya={{ available: true, kind: "estimasi", amount_idr: 5000000, prevented_referrals: 4, assumptions: ["Asumsi A"], disclaimer: "Estimasi potensi efisiensi, bukan penghematan aktual." }} />);
    expect(screen.getByText("Estimasi potensi efisiensi biaya")).toBeInTheDocument();
    expect(screen.getByText("Asumsi A")).toBeInTheDocument();
    expect(screen.getByText(/bukan penghematan aktual/)).toBeInTheDocument();
  });
  it("tanpa asumsi pemilik, tidak ada angka rupiah", () => {
    render(<CostEstimate biaya={{ available: false, kind: "estimasi", reason: "asumsi biaya belum ditetapkan", disclaimer: "Estimasi." }} />);
    expect(screen.queryByText(/Rp/)).toBeNull();
    expect(screen.getByText(/asumsi biaya belum ditetapkan/)).toBeInTheDocument();
  });
});

describe("SimulationResult", () => {
  it("menandai hasil sebagai simulasi dan menampilkan catatan bahwa jarak tidak mengubah skor", () => {
    const hasil: HasilSimulasi = {
      simulated: true, notice: "Simulasi: hasil tidak disimpan.", applied_inputs: [],
      model: { score: 31.6, category: "green", yellow_from: 50, red_from: 80, model_version: "v1" },
      destination_fit: { verdict: "belum_terverifikasi", checks: [], affects_score: false, basis: "dasar" },
      not_in_model: "Jarak dan kompetensi tidak mengubah skor di atas.",
    };
    render(<SimulationResult hasil={hasil} />);
    expect(screen.getByText(/bukan rujukan nyata/)).toBeInTheDocument();
    expect(screen.getByText(/tidak mengubah skor di atas/)).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
  });
});
