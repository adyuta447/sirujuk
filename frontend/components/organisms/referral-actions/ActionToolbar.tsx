import { Archive, Pencil, RefreshCw } from "lucide-react";
import { TOOLBAR_BUTTON_CLASS } from "../../../lib/ui-classes";
import type { ActionMode } from "../../../hooks/useReferralActions";
import { SecondaryButton } from "../../atoms/SecondaryButton";

interface ActionToolbarProps {
  mode: ActionMode;
  sibuk: boolean;
  bisaUbah: boolean;
  bisaArsip: boolean;
  onRescore: () => void;
  onToggle: (mode: Exclude<ActionMode, "idle">) => void;
}

export function ActionToolbar({ sibuk, bisaUbah, bisaArsip, onRescore, onToggle }: ActionToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <SecondaryButton disabled={sibuk} onClick={onRescore} className={TOOLBAR_BUTTON_CLASS}>
        <RefreshCw aria-hidden="true" size={16} /> Hitung ulang (ML)
      </SecondaryButton>
      {bisaUbah && (
        <SecondaryButton disabled={sibuk} onClick={() => onToggle("edit")} className={TOOLBAR_BUTTON_CLASS}>
          <Pencil aria-hidden="true" size={16} /> Ubah data
        </SecondaryButton>
      )}
      {bisaArsip && (
        <SecondaryButton disabled={sibuk} onClick={() => onToggle("arsip")} className={TOOLBAR_BUTTON_CLASS}>
          <Archive aria-hidden="true" size={16} /> Arsipkan
        </SecondaryButton>
      )}
    </div>
  );
}
