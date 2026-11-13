"use client";

import { useEffect, useState } from "react";

/** Status menu mobile; saat terbuka scroll body dikunci dan Escape menutup. */
export function useMobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tutup);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", tutup);
    };
  }, [open]);

  return { open, setOpen };
}
