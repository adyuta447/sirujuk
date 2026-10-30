import { Check, Lock, ShieldAlert } from "lucide-react";

export const klaim = {
  ditahan: { label: "Klaim ditahan sementara", bg: "#9A5A08", Icon: Lock },
  dilepas: { label: "Klaim dilepas", bg: "#17803F", Icon: Check },
  "temuan-terkonfirmasi": { label: "Temuan terkonfirmasi", bg: "#C42222", Icon: ShieldAlert },
} as const;
