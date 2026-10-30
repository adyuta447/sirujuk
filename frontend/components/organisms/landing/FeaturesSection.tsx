import { SectionHeading } from "../../atoms/SectionHeading";
import { ContentSection } from "../../molecules/ContentSection";
import { FITUR } from "../../../data/landing-features";
import { FeatureCard } from "./FeatureCard";
import { SisruteNote } from "./SisruteNote";

export function FeaturesSection() {
  return (
    <ContentSection id="fitur" className="py-20 scroll-mt-20">
      <SectionHeading className="max-w-3xl">
        Kerja verifikasi jadi lebih terarah.
      </SectionHeading>
      <div className="grid md:grid-cols-3 gap-5 mt-12">
        {FITUR.map((feature) => (
          <FeatureCard key={feature.judul} feature={feature} />
        ))}
      </div>
      <SisruteNote />
    </ContentSection>
  );
}
