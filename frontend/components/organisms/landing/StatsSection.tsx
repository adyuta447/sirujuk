"use client";

import { useInViewOnce } from "../../../hooks/useInViewOnce";
import { ContentSection } from "../../molecules/ContentSection";
import { STAT } from "../../../data/landing-stats";
import { StatCard } from "./StatCard";

// Counter statistik mulai sekali saat seksi masuk viewport.
export function StatsSection() {
  const { ref, terlihat } = useInViewOnce<HTMLElement>(0.3);

  return (
    <ContentSection sectionRef={ref} label="SIRUJUK dalam angka" className="relative z-10 lg:-mt-16">
      <h2 className="sr-only">SIRUJUK dalam angka</h2>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 lg:pt-0">
        {STAT.map((stat, i) => (
          <StatCard key={stat.l} stat={stat} mulai={terlihat} delay={i * 150} />
        ))}
      </dl>
    </ContentSection>
  );
}
