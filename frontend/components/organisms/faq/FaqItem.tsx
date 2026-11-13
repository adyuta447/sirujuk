import { Plus } from "lucide-react";
import { TEAL } from "../../../data/faq-accent";
import type { FaqEntry } from "../../../types/faq";

interface FaqItemProps {
  entry: FaqEntry;
  index: number;
  open: boolean;
  tampil: boolean;
  rapi: boolean;
  onToggle: () => void;
}

export function FaqItem({ entry, index, open, tampil, rapi, onToggle }: FaqItemProps) {
  const panelId = `faq-isi-${index}`;
  return (
    <div
      className="bg-white rounded-4xl border transition-all duration-300 motion-safe:data-[tampil=false]:opacity-0 motion-safe:data-[tampil=false]:translate-y-4"
      data-tampil={tampil}
      style={{ borderColor: open ? "#1E3A5F" : "#DCE3EC", transitionDelay: rapi ? undefined : `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full min-h-14 flex items-center gap-4 cursor-pointer text-left px-6 py-4 rounded-4xl focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1E3A5F]"
      >
        <span
          aria-hidden="true"
          className="font-mono text-sm font-extrabold shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-colors duration-300"
          style={{ backgroundColor: open ? "#1E3A5F" : "#E7ECF3", color: open ? "#FFFFFF" : TEAL }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 font-bold text-lg leading-snug">{entry.tanya}</span>
        <span
          aria-hidden="true"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            backgroundColor: open ? TEAL : "#F4F6F9",
            color: open ? "#FFFFFF" : "#1E3A5F",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          <Plus size={18} />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="text-[#56657A] leading-relaxed px-6 pb-5 pl-[4.75rem]">{entry.jawab}</p>
        </div>
      </div>
    </div>
  );
}
