"use client";

import { DEFAULT_REGION } from "../lib/constants";
import { useMemo } from "react";
import type { RiskLevel, RujukanCase } from "../lib/sirujuk-data";
import { RISK_ORDER } from "../lib/constants";

export function useAuditQueue(
  referrals: RujukanCase[] | undefined,
  wilayah: string,
  filter: RiskLevel | "semua",
) {
  return useMemo(() => {
    const base = (referrals ?? [])
      .filter((referral) => wilayah === DEFAULT_REGION || referral.wilayah === wilayah)
      .slice()
      .sort(
        (a, b) =>
          RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.riskScore - a.riskScore,
      );

    const filtered =
      filter === "semua" ? base : base.filter((referral) => referral.risk === filter);

    const counts = {
      tinggi: base.filter((referral) => referral.risk === "tinggi").length,
      sedang: base.filter((referral) => referral.risk === "sedang").length,
      rendah: base.filter((referral) => referral.risk === "rendah").length,
    };

    return { base, filtered, counts };
  }, [filter, referrals, wilayah]);
}
