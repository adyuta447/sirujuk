import { Illustration } from "../../atoms/Illustration";
import type { Feature } from "../../../types/landing";

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({
  feature: { judul, isi, art },
}: FeatureCardProps) {
  return (
    <article className="group rounded-4xl p-7 flex flex-col bg-white border border-[#DCE3EC] text-[#0E1B2A] transition-colors hover:bg-[#1E3A5F] hover:text-white hover:border-[#1E3A5F]">
      <h3 className="text-2xl font-extrabold tracking-tight">{judul}</h3>
      <p className="mt-2 flex-1">{isi}</p>
      <div className="rounded-4xl mt-7 p-4 bg-[#F4F6F9] transition-colors group-hover:bg-white">
        <Illustration name={art} className="w-full h-40" />
      </div>
    </article>
  );
}
