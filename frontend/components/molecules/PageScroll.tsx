import type { ReactNode, Ref } from "react";

interface PageScrollProps {
  children: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
  spacing?: string;
}

/** Area konten halaman yang bisa di-scroll; jarak antar blok diatur lewat `spacing`. */
export function PageScroll({ children, scrollRef, spacing = "space-y-5" }: PageScrollProps) {
  return (
    <div ref={scrollRef} className={`scroll-area flex-1 overflow-y-auto p-4 sm:p-6 ${spacing}`}>
      {children}
    </div>
  );
}
