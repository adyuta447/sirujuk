import type { ReactNode } from "react";

interface LightButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

/** Tombol putih untuk latar gelap. */
export function LightButton({ children, onClick, className = "" }: LightButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 inline-flex items-center justify-center gap-2 rounded-4xl font-bold bg-white text-[#1E3A5F] hover:bg-[#E7ECF3] transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
