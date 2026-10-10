import { Illustration } from "./Illustration";
import type { IllustrationName } from "./Illustration";

export function PageHead({
  title,
  sub,
  art,
}: {
  title: string;
  sub?: string;
  art?: IllustrationName;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0E1B2A] tracking-tight leading-[1.1]">{title}</h1>
        {sub && <p className="text-base text-[#56657A] mt-2">{sub}</p>}
      </div>
      {art && <Illustration name={art} className="hidden md:block w-44 h-32 shrink-0" />}
    </div>
  );
}
