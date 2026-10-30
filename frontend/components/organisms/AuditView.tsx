"use client";

import type { RujukanCase } from "../../lib/sirujuk-data";
import { AuditCase } from "./audit/AuditCase";
import { AuditPicker } from "./audit/AuditPicker";

interface AuditViewProps {
  kasus: RujukanCase | null;
  onDone: () => void;
  onSelect: (c: RujukanCase) => void;
  onKlarifikasi: (c: RujukanCase) => void;
}

export function AuditView({
  kasus,
  onDone,
  onSelect,
  onKlarifikasi,
}: AuditViewProps) {
  if (!kasus) return <AuditPicker onSelect={onSelect} />;
  return (
    <AuditCase kasus={kasus} onDone={onDone} onKlarifikasi={onKlarifikasi} />
  );
}
