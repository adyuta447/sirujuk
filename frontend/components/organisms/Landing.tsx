"use client";

import { useAtTop } from "../../hooks/useAtTop";
import { useDarkRootBackground } from "../../hooks/useDarkRootBackground";
import { useMobileMenu } from "../../hooks/useMobileMenu";
import { Faq } from "./Faq";
import { AudienceSection } from "./landing/AudienceSection";
import { CtaSection } from "./landing/CtaSection";
import { FeaturesSection } from "./landing/FeaturesSection";
import { HeroSection } from "./landing/HeroSection";
import { LandingFooter } from "./landing/LandingFooter";
import { LandingHeader } from "./landing/LandingHeader";
import { MobileMenu } from "./landing/MobileMenu";
import { StatsSection } from "./landing/StatsSection";
import { LangkahScroll } from "./LangkahScroll";

interface LandingProps {
  onEnter: () => void;
  onDaftar: () => void;
}

export function Landing({ onEnter, onDaftar }: LandingProps) {
  const atas = useAtTop();
  const menu = useMobileMenu();
  useDarkRootBackground();

  return (
    <div className="min-h-screen bg-white text-[#0E1B2A]">
      <LandingHeader
        atas={atas}
        menuOpen={menu.open}
        onToggleMenu={() => menu.setOpen(!menu.open)}
        onEnter={onEnter}
        onDaftar={onDaftar}
      />
      {menu.open && <MobileMenu onClose={() => menu.setOpen(false)} onEnter={onEnter} />}
      <main>
        <HeroSection onEnter={onEnter} />
        <StatsSection />
        <FeaturesSection />
        <LangkahScroll />
        <AudienceSection />
        <Faq />
        <CtaSection onEnter={onEnter} />
      </main>
      <LandingFooter onEnter={onEnter} onDaftar={onDaftar} />
    </div>
  );
}
