"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDestinationFit } from "../services/hospital.service";

export function useDestinationFit(id: string, jarakKm: string) {
  return useQuery({
    queryKey: ["destination-fit", id, jarakKm],
    queryFn: () => getDestinationFit(id, jarakKm),
    // Mengetik jarak tidak mengosongkan panel di antara dua permintaan.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
