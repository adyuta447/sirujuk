import { ArrowRight } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";
import { LightButton } from "../../atoms/LightButton";
import { SectionHeading } from "../../atoms/SectionHeading";
import { ContentSection } from "../../molecules/ContentSection";

interface CtaSectionProps {
  onEnter: () => void;
}

export function CtaSection({ onEnter }: CtaSectionProps) {
  return (
    <ContentSection className="py-20">
      <div
        className="rounded-4xl p-8 md:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center text-white"
        style={{ backgroundColor: NAVY }}
      >
        <SectionHeading>Siap mulai mengecek?</SectionHeading>
        <LightButton onClick={onEnter} className="px-8">
          Masuk ke SIRUJUK <ArrowRight aria-hidden="true" size={18} />
        </LightButton>
      </div>
    </ContentSection>
  );
}
