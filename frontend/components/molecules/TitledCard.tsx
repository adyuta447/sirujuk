import type { ReactNode } from "react";
import { Card } from "../atoms/Card";

interface TitledCardProps {
  title: string;
  children: ReactNode;
}

export function TitledCard({ title, children }: TitledCardProps) {
  return (
    <Card className="p-5">
      <div className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">{title}</div>
      {children}
    </Card>
  );
}
