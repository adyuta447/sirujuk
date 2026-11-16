"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_REGION } from "../lib/constants";
import { getHospitals } from "../services/hospital.service";

export function useHospitals(kind: string, wilayah: string) {
  return useQuery({
    queryKey: ["hospitals", kind, wilayah],
    queryFn: () => getHospitals(kind, wilayah === DEFAULT_REGION ? "" : wilayah),
    staleTime: 5 * 60 * 1000,
  });
}
