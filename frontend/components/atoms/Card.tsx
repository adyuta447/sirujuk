import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  as?: "div" | "article" | "section";
  role?: string;
  label?: string;
  className?: string;
}

export function Card({ children, as: Tag = "div", role, label, className = "" }: CardProps) {
  return (
    <Tag role={role} aria-label={label} className={`bg-white rounded-4xl border border-[#DCE3EC] ${className}`}>
      {children}
    </Tag>
  );
}
