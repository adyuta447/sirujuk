// Langkah masuk via whileInView spring sekali tampil.
export const MASUK = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { type: "spring", stiffness: 80, damping: 20, delay: 0.1 },
} as const;
