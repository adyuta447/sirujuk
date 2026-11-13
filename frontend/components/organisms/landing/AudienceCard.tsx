import { Card } from "../../atoms/Card";
import { Illustration } from "../../atoms/Illustration";
import type { Audience } from "../../../types/landing";

interface AudienceCardProps {
  audience: Audience;
}

export function AudienceCard({
  audience: { judul, isi, art },
}: AudienceCardProps) {
  return (
    <Card as="article" className="p-5 flex flex-col">
      <Illustration name={art} className="w-full h-36" />
      <h3 className="text-xl font-extrabold tracking-tight mt-4">{judul}</h3>
      <p className="text-sm text-[#56657A] mt-1 flex-1">{isi}</p>
    </Card>
  );
}
