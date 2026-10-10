import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 min-h-11 text-white font-semibold rounded-4xl bg-[#1E3A5F] hover:bg-[#16304F] transition-colors disabled:cursor-not-allowed disabled:bg-[#9AA8BA] ${className}`}
    >
      {children}
    </button>
  );
}
