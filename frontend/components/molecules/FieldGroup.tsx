import { useId } from "react";
import type { ReactNode } from "react";

interface FieldGroupProps {
  title: string;
  children: ReactNode;
}

/** Sekelompok isian yang saling terkait: judul kecil dan label untuk pembaca layar. */
export function FieldGroup({ title, children }: FieldGroupProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h3 id={id} className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
        {title}
      </h3>
      {children}
    </section>
  );
}
