import { motion } from "framer-motion";
import { MASUK } from "../../../data/step-motion";
import { Illustration } from "../../atoms/Illustration";
import type { Langkah } from "../../../types/langkah";
import { StepText } from "./StepText";

interface StepItemProps {
  step: Langkah;
  index: number;
  animated: boolean;
}

export function StepItem({ step, index, animated }: StepItemProps) {
  const kiri = index % 2 === 0;
  const Item = animated ? motion.li : "li";

  return (
    <Item {...(animated ? MASUK : {})} className={animated ? "relative min-h-[72vh] flex items-center py-10" : ""}>
      <div className="w-full grid lg:grid-cols-2 gap-10 lg:gap-32 items-center">
        <StepText step={step} nomor={index + 1} className={kiri ? "order-2 lg:order-1" : "order-2 lg:order-2"} />
        <div className={`relative h-52 md:h-72 lg:h-[22rem] ${kiri ? "order-1 lg:order-2" : "order-1 lg:order-1"}`}>
          <Illustration name={step.art} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    </Item>
  );
}
