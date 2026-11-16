import type { ReactNode } from "react";

interface FieldGridProps {
  kolom: 2 | 3 | 4;
  children: ReactNode;
}

// Kelas ditulis utuh supaya Tailwind menemukannya.
const KOLOM = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Baris isian: satu kolom di HP, `kolom` kolom di layar lebar. */
export function FieldGrid({ kolom, children }: FieldGridProps) {
  return <div className={`grid gap-4 ${KOLOM[kolom]}`}>{children}</div>;
}
