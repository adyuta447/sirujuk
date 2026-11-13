import type { ReactNode } from "react";

interface FooterColumnProps {
  title: string;
  label?: string;
  children: ReactNode;
}

export function FooterColumn({ title, label, children }: FooterColumnProps) {
  const Tag = label ? "nav" : "div";
  return (
    <Tag aria-label={label} className="space-y-2.5">
      <div className="font-bold text-white mb-3">{title}</div>
      {children}
    </Tag>
  );
}
