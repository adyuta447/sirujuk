type Status = "menunggu" | "sedang-diaudit" | "selesai";

const statuses = {
  menunggu: { label: "Masih antre", bg: "#8A98AC" },
  "sedang-diaudit": { label: "Lagi dicek", bg: "#1E3A5F" },
  selesai: { label: "Sudah beres", bg: "#0E1B2A" },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const config = statuses[status];

  return (
    <span role="status" className="inline-block px-2.5 py-1 rounded-4xl text-xs font-semibold text-white" style={{ backgroundColor: config.bg }}>
      {config.label}
    </span>
  );
}
