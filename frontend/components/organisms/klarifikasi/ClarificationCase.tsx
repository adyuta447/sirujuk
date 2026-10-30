"use client";

import type { RujukanCase } from "../../../lib/sirujuk-data";
import { useClarificationForm } from "../../../hooks/useClarificationForm";
import { ClarificationForm } from "./ClarificationForm";
import { ClarificationSent } from "./ClarificationSent";

interface ClarificationCaseProps {
  kasus: RujukanCase;
  onDetail: (c: RujukanCase) => void;
  onDokter: (nama: string) => void;
}

export function ClarificationCase({ kasus, onDetail, onDokter }: ClarificationCaseProps) {
  const form = useClarificationForm(kasus.id);

  if (form.terkirim) return <ClarificationSent kasus={kasus} onDetail={onDetail} />;
  return <ClarificationForm kasus={kasus} form={form} onDokter={onDokter} />;
}
