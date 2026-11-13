import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

export function SectionHeading({ children, className = "" }: SectionHeadingProps) {
  return (
    <h2 className={`text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] ${className}`}>{children}</h2>
  );
}
