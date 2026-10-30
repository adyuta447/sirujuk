"use client";

import { useRef } from "react";
import { useScroll, useSpring } from "framer-motion";

// framer-motion menulis ke DOM langsung tanpa re-render React tiap frame, jadi mulus dua arah.
export function useScrollLine() {
  const daftarRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: daftarRef, offset: ["start center", "end center"] });
  const halus = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return { daftarRef, halus };
}
