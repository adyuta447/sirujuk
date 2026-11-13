export type Status = "menunggu" | "sedang-diaudit" | "selesai";

export const statuses = {
  menunggu: { label: "Menunggu", bg: "#64748B" },
  "sedang-diaudit": { label: "Sedang dicek", bg: "#1E3A5F" },
  selesai: { label: "Selesai", bg: "#0E1B2A" },
} as const;
