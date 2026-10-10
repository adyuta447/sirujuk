type Status = "menunggu" | "sedang-diaudit" | "selesai";

const statuses = {
  menunggu: { label: "Menunggu", bg: "#64748B" },
  "sedang-diaudit": { label: "Sedang dicek", bg: "#1E3A5F" },
  selesai: { label: "Selesai", bg: "#0E1B2A" },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const config = statuses[status];

  return (
    <span role="status" className="inline-block px-2.5 py-1 rounded-4xl text-xs font-semibold text-white" style={{ backgroundColor: config.bg }}>
      {config.label}
    </span>
  );
}
