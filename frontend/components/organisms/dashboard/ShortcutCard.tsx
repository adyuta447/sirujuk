import { Card } from "../../atoms/Card";
import { Illustration } from "../../atoms/Illustration";
import type { Shortcut } from "../../../types/dashboard";

interface ShortcutCardProps {
  shortcut: Shortcut;
  onClick: () => void;
}

export function ShortcutCard({ shortcut: { art, judul, isi }, onClick }: ShortcutCardProps) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="p-5 flex items-center gap-4 hover:border-[#1E3A5F] transition-colors">
        <Illustration name={art} className="w-24 h-20 shrink-0" />
        <div className="min-w-0">
          <div className="text-lg font-extrabold tracking-tight text-[#0E1B2A]">{judul}</div>
          <p className="text-sm text-[#56657A] mt-0.5">{isi}</p>
        </div>
      </Card>
    </button>
  );
}
