"use client";

import { useQuery } from "@tanstack/react-query";
import { getDestinationFit } from "../services/hospital.service";

export function useDestinationFit(id: string, jarakKm: string) {
  return useQuery({
    queryKey: ["destination-fit", id, jarakKm],
    queryFn: () => getDestinationFit(id, jarakKm),
    staleTime: 60 * 1000,
  });
}
