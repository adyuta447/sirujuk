import { RISK } from "../../../lib/sirujuk-data";

interface AuditNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function AuditNoteField({ value, onChange }: AuditNoteFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="catatan-verifikator"
        className="text-sm font-bold text-[#0E1B2A]"
      >
        Catatan alasan <span style={{ color: RISK.tinggi.solid }}>*</span>
      </label>
      <textarea
        id="catatan-verifikator"
        aria-required="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tulis alasan keputusan atau langkah berikutnya."
        className="w-full h-32 px-4 py-3 text-sm text-[#0E1B2A] bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]"
      />
    </div>
  );
}
