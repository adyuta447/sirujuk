import type { ReactNode } from "react";
import { Card } from "./Card";
import { Illustration } from "./Illustration";
import type { IllustrationName } from "./Illustration";

interface EmptyStateProps {
  art: IllustrationName;
  title: string;
  body?: string;
  /** Langkah berikutnya, mis. tombol. */
  children?: ReactNode;
  /** Di dalam kartu yang sudah ada: tanpa kartu sendiri, ilustrasi lebih kecil. */
  embedded?: boolean;
}

/** Keadaan kosong standar: ilustrasi di tengah, lalu judul, penjelasan, dan langkah berikutnya di bawahnya. */
export function EmptyState({ art, title, body, children, embedded = false }: EmptyStateProps) {
  const isi = (
    <div role="status" className={`flex flex-col items-center text-center px-4 ${embedded ? "py-6" : "py-10"}`}>
      <Illustration name={art} className={embedded ? "w-32 h-24" : "w-44 h-32"} />
      <p className="font-bold text-[#0E1B2A] mt-3">{title}</p>
      {body && <p className="text-sm text-[#56657A] mt-1 max-w-sm">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
  return embedded ? isi : <Card>{isi}</Card>;
}
