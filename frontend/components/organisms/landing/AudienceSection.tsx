import { SectionHeading } from "../../atoms/SectionHeading";
import { ContentSection } from "../../molecules/ContentSection";
import { AudienceCard } from "./AudienceCard";
import { KATEGORI } from "../../../data/landing-outcomes";
import { PENGGUNA } from "../../../data/landing-audience";
import { OutcomeCard } from "./OutcomeCard";

export function AudienceSection() {
  return (
    <ContentSection id="pengguna" className="py-20 scroll-mt-20">
      <SectionHeading className="max-w-3xl">
        Satu sistem, empat peran.
      </SectionHeading>
      <p className="mt-4 text-lg text-[#56657A] max-w-2xl">
        Empat peran memakai satu sistem yang sama, dari antrean sampai
        klarifikasi.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
        {PENGGUNA.map((audience) => (
          <AudienceCard key={audience.judul} audience={audience} />
        ))}
      </div>
      <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-12">
        Hasilnya ada tiga.
      </h3>
      <p className="mt-3 text-[#56657A] max-w-2xl">
        Apapun peranmu, setiap rujukan berakhir di salah satu dari tiga ini.
      </p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {KATEGORI.map((outcome) => (
          <OutcomeCard key={outcome.label} outcome={outcome} />
        ))}
      </div>
    </ContentSection>
  );
}
