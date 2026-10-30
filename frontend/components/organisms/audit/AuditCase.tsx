"use client";

import { hanyaTkmkb } from "../../../lib/akses";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { useAuditForm } from "../../../hooks/useAuditForm";
import { useSession } from "../../../hooks/useSession";
import { AuditForm } from "./AuditForm";
import { AuditSaved } from "./AuditSaved";
import { AuditTkmkbNotice } from "./AuditTkmkbNotice";

interface AuditCaseProps {
  kasus: RujukanCase;
  onDone: () => void;
  onKlarifikasi: (c: RujukanCase) => void;
}

export function AuditCase({ kasus, onDone, onKlarifikasi }: AuditCaseProps) {
  const { data: sesi } = useSession();
  const form = useAuditForm(kasus, onDone);

  if (form.submitted) {
    return (
      <AuditSaved
        kasus={kasus}
        keputusan={form.keputusan}
        onKlarifikasi={onKlarifikasi}
        onDone={onDone}
      />
    );
  }
  if (hanyaTkmkb(kasus.risk, sesi?.role)) {
    return <AuditTkmkbNotice kasus={kasus} onKlarifikasi={onKlarifikasi} />;
  }
  return (
    <AuditForm
      kasus={kasus}
      form={form}
      nama={sesi?.nama}
      peran={sesi?.role}
      onCancel={onDone}
    />
  );
}
