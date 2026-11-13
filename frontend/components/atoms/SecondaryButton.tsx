import type { ReactNode } from "react";

interface SecondaryButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function SecondaryButton({ children, onClick, disabled = false, className = "px-5 py-3" }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 border border-[#DCE3EC] bg-white text-[#1E3A5F] font-semibold rounded-4xl hover:bg-[#F8FAFC] disabled:opacity-50 inline-flex items-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}
