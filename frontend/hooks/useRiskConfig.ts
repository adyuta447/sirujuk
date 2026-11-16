"use client";

import { useQuery } from "@tanstack/react-query";
import { getRiskConfig } from "../services/risk-config.service";

export function useRiskConfig() {
  return useQuery({ queryKey: ["risk-config"], queryFn: getRiskConfig, staleTime: 60 * 1000 });
}
