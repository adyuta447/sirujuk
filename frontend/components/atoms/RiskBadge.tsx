type RiskLevel = "tinggi" | "sedang" | "rendah";

const risk = {
  tinggi: { label: "Perlu Dicek", solid: "#D42828" },
  sedang: { label: "Cek Lagi", solid: "#C77A0A" },
  rendah: { label: "Aman", solid: "#1C8C4A" },
} as const;

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const color = risk[level];

  return (
    <span
      role="status"
      aria-label={`${color.label}${score != null ? `, skor ${score}` : ""}`}
      className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-4xl text-xs font-bold text-white"
      style={{ backgroundColor: color.solid }}
    >
      {color.label}
      {score != null && (
        <span className="font-mono px-1.5 py-0.5 rounded-4xl text-white" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
          {score}
        </span>
      )}
    </span>
  );
}
