import { CountUp } from "../../atoms/CountUp";
import { Card } from "../../atoms/Card";
import type { Stat } from "../../../types/landing";

interface StatCardProps {
  stat: Stat;
  mulai: boolean;
  delay: number;
}

export function StatCard({ stat: { v, suffix, l, Icon }, mulai, delay }: StatCardProps) {
  return (
    <Card className="p-5 md:p-6">
      <Icon aria-hidden="true" size={28} className="text-[#1E3A5F]" />
      <dt className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0E1B2A] mt-4 tabular-nums">
        <CountUp target={v} suffix={suffix} mulai={mulai} delay={delay} />
      </dt>
      <dd className="text-sm text-[#56657A] mt-1">{l}</dd>
    </Card>
  );
}
