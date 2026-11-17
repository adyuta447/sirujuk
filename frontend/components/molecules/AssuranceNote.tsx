import { ShieldCheck } from "lucide-react";

interface AssuranceNoteProps {
  title: string;
  children: string;
}

/** Jaminan singkat untuk pengguna: ikon dan judul sebaris (tinggi sama), penjelasan di bawahnya. */
export function AssuranceNote({ title, children }: AssuranceNoteProps) {
  return (
    <div role="note" className="rounded-4xl border border-[#DCE3EC] bg-white p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17803F] text-white">
          <ShieldCheck size={18} />
        </span>
        <p className="text-base font-extrabold leading-none text-[#0E1B2A]">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#56657A]">{children}</p>
    </div>
  );
}
