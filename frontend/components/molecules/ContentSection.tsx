import type { ReactNode, Ref } from "react";

interface ContentSectionProps {
  children: ReactNode;
  id?: string;
  label?: string;
  sectionRef?: Ref<HTMLElement>;
  className?: string;
}

/** Seksi landing selebar konten (maks 75rem) dengan gutter responsif. */
export function ContentSection({ children, id, label, sectionRef, className = "" }: ContentSectionProps) {
  return (
    <section
      id={id}
      ref={sectionRef}
      aria-label={label}
      className={`max-w-[75rem] mx-auto px-5 md:px-10 ${className}`}
    >
      {children}
    </section>
  );
}
