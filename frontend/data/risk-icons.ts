import { Check, Eye, OctagonAlert } from "lucide-react";

// Ikon + label supaya kategori tidak bergantung pada warna saja.
export const ICON = { tinggi: OctagonAlert, sedang: Eye, rendah: Check } as const;
