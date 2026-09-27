import type { ReactNode } from "react";

const NAVY = "#1E3A5F";
const NAVY_HOVER = "#16304F";

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
      className={`inline-flex items-center justify-center gap-2 text-white font-semibold rounded-4xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ backgroundColor: NAVY }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = NAVY_HOVER;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = NAVY;
      }}
    >
      {children}
    </button>
  );
}
