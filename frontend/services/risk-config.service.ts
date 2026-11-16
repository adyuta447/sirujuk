import type { HasilKonfigRisiko, InputKonfigRisiko, KonfigRisiko } from "../types/risk-config";
import { api } from "./api";

export const getRiskConfig = () => api<KonfigRisiko>("/config/risk");

/** Hanya menghitung dampak; tidak menyimpan apa pun. */
export const previewRiskConfig = (input: InputKonfigRisiko) =>
  api<HasilKonfigRisiko>("/config/risk?dry_run=true", { method: "PUT", body: JSON.stringify(input) });

export const saveRiskConfig = (input: InputKonfigRisiko) =>
  api<HasilKonfigRisiko>("/config/risk", { method: "PUT", body: JSON.stringify(input) });
