import { ShieldCheck } from "lucide-react";

interface AssuranceNoteProps {
  title: string;
  children: string;
}

/** Jaminan singkat untuk pengguna: ikon di lingkaran hijau, judul tebal, lalu penjelasan. */
export function AssuranceNote({ title, children }: AssuranceNoteProps) {
  return (
    <div role="note" className="flex items-start gap-4 rounded-4xl border border-[#DCE3EC] bg-white p-5">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#17803F] text-white">
        <ShieldCheck size={22} />
      </span>
      <div>
        <p className="text-base font-extrabold text-[#0E1B2A]">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-[#56657A]">{children}</p>
      </div>
    </div>
  );
}
