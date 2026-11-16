import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CostEstimate } from "../../components/organisms/analytics/CostEstimate";
import { PreventionPanel } from "../../components/organisms/analytics/PreventionPanel";
import { FORM_SIMULASI_KOSONG } from "../../data/form-simulasi-kosong";
import { ModelInputs } from "../../components/organisms/simulation/ModelInputs";
import { RiskConfigForm } from "../../components/organisms/risk-config/RiskConfigForm";
import { SimulationResult } from "../../components/organisms/simulation/SimulationResult";
import type { KonfigRisiko } from "../../types/risk-config";
import type { HasilSimulasi } from "../../types/simulate";

let mockData: object | null = null;
jest.mock("../../hooks/usePrevention", () => ({ usePrevention: () => ({ data: mockData }) }));

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

describe("kategori di Pengaturan Risiko", () => {
  it("memakai lencana risiko yang sama dengan seluruh app, di daftar rekomendasi dan di pratinjau dampak", () => {
    render(bungkus(<RiskConfigForm konfig={KONFIG} bisaUbah={false} />));
    expect(screen.getByText("Risiko Tinggi")).toBeInTheDocument();
    expect(screen.getAllByText(/Peringatan aktif|Tanpa peringatan/)).toHaveLength(3);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("TKMKB mengisi rekomendasi lewat kolom berlabel per kategori", () => {
    render(bungkus(<RiskConfigForm konfig={KONFIG} bisaUbah />));
    expect(screen.getByLabelText("Rekomendasi tindakan Merah (tinggi)")).toHaveValue("Periksa");
  });
});

describe("ModelInputs", () => {
  it("setiap isian teks dan angka memberi contoh nilai, bukan teks generik", () => {
    render(<ModelInputs form={FORM_SIMULASI_KOSONG} onChange={() => {}} />);
    for (const contoh of ["Contoh: r-001", "Contoh: J06.9", "Contoh: 25", "Contoh: 40", "Contoh: 45", "Contoh: 2500", "Contoh: 7"]) {
      expect(screen.getByPlaceholderText(contoh)).toBeInTheDocument();
    }
    expect(screen.queryByPlaceholderText("Tidak diubah")).toBeNull();
  });
});

describe("CostEstimate", () => {
  it("dengan asumsi: angka berlabel estimasi dan daftar asumsinya", () => {
    render(<CostEstimate biaya={{ available: true, kind: "estimasi", amount_idr: 5000000, prevented_referrals: 4, assumptions: ["Asumsi A"], disclaimer: "x" }} />);
    expect(screen.getByText("Estimasi potensi efisiensi biaya")).toBeInTheDocument();
    expect(screen.getByText("Asumsi A")).toBeInTheDocument();
  });
  it("tanpa asumsi: tidak ada rupiah, dan nama variabel internal backend tidak tampil", () => {
    render(<CostEstimate biaya={{ available: false, kind: "estimasi", reason: "Belum ada asumsi (ASSUMED_COST_PER_PREVENTED_REFERRAL_IDR)", disclaimer: "x" }} />);
    expect(screen.queryByText(/Rp/)).toBeNull();
    expect(screen.queryByText(/ASSUMED_/)).toBeNull();
    expect(screen.getByText(/pemilik sistem belum menetapkan asumsi biaya/)).toBeInTheDocument();
  });
});

describe("PreventionPanel", () => {
  const data = (o: object) => ({
    total: 10, kns_total: 4, kns_percent: 40, kns_flagged: 2, kns_confirmed_invalid: 0, by_fktp: [], by_fkrtl: [],
    cost: { available: false, kind: "estimasi", disclaimer: "Estimasi potensi efisiensi, bukan penghematan aktual." }, basis: "dasar", ...o,
  });
  const tampil = (d: object) => {
    mockData = d;
    render(<PreventionPanel />);
  };
  it("selalu membawa disclaimer estimasi, dan keadaan kosong ada di dalam kartu faskes", () => {
    tampil(data({}));
    expect(screen.getByText(/bukan penghematan aktual/)).toBeInTheDocument();
    expect(screen.getAllByText("Belum ada rujukan yang ditandai")).toHaveLength(2);
  });
  it("menampilkan faskes yang ditandai dengan jumlahnya", () => {
    tampil(data({ by_fktp: [{ id: "FKTP-A", total: 8, flagged: 3, red: 1, flagged_percent: 37.5 }] }));
    expect(screen.getByText("FKTP-A")).toBeInTheDocument();
    expect(screen.getByText("3 dari 8")).toBeInTheDocument();
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
