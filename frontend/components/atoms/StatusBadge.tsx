import { statuses } from "../../data/status-styles";
import type { Status } from "../../data/status-styles";

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statuses[status];

  return (
    <span role="status" className="inline-block px-2.5 py-1 rounded-4xl text-xs font-semibold text-white" style={{ backgroundColor: config.bg }}>
      {config.label}
    </span>
  );
}
