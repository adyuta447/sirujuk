import { AUDIT_CHECKLIST, RISK } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import { AuditChecklistItem } from "./AuditChecklistItem";

interface AuditChecklistProps {
  checks: boolean[];
  onToggle: (index: number) => void;
}

export function AuditChecklist({ checks, onToggle }: AuditChecklistProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-sm text-[#0E1B2A]">Daftar periksa</div>
        <span className="text-xs font-semibold" style={{ color: checks.every(Boolean) ? RISK.rendah.text : "#64748B" }}>
          {checks.filter(Boolean).length} dari {AUDIT_CHECKLIST.length} selesai
        </span>
      </div>
      <div className="space-y-1">
        {AUDIT_CHECKLIST.map((item, i) => (
          <AuditChecklistItem key={item} label={item} checked={checks[i]} onToggle={() => onToggle(i)} />
        ))}
      </div>
    </Card>
  );
}
