import { motion } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { ALUR } from "../../../data/alur";

interface FlowLineProps {
  progress: MotionValue<number>;
}

export function FlowLine({ progress }: FlowLineProps) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full hidden md:block pointer-events-none"
      viewBox="0 0 1000 1200"
      preserveAspectRatio="none"
    >
      <motion.path d={ALUR} fill="none" stroke="#7DB4F5" strokeWidth="3" strokeLinecap="round" style={{ pathLength: progress }} />
    </svg>
  );
}
