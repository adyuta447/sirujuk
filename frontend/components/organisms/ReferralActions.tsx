"use client";

import type { RujukanCase } from "../../lib/sirujuk-data";
import { useReferralActions } from "../../hooks/useReferralActions";
import { Card } from "../atoms/Card";
import { ActionMessages } from "./referral-actions/ActionMessages";
import { ActionToolbar } from "./referral-actions/ActionToolbar";
import { ArchiveForm } from "./referral-actions/ArchiveForm";
import { EditForm } from "./referral-actions/EditForm";

interface ReferralActionsProps {
  kasus: RujukanCase;
  onArchived: () => void;
}

export function ReferralActions({ kasus, onArchived }: ReferralActionsProps) {
  const actions = useReferralActions(kasus, onArchived);

  return (
    <Card as="section" label="Aksi rujukan" className="p-5 space-y-4">
      <ActionToolbar
        mode={actions.mode}
        sibuk={actions.sibuk}
        bisaUbah={actions.bisaUbah}
        bisaArsip={actions.bisaArsip}
        onRescore={actions.rescore}
        onToggle={actions.toggleMode}
      />
      {actions.mode === "edit" && <EditForm actions={actions} />}
      {actions.mode === "arsip" && <ArchiveForm actions={actions} />}
      <ActionMessages actions={actions} />
    </Card>
  );
}
