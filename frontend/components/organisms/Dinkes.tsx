"use client";

import { useDinkes } from "../../hooks/useDinkes";
import { BannerSintetis } from "../atoms/BannerSintetis";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { RegionCard } from "./dinkes/RegionCard";
import { RegionLoadError } from "./dinkes/RegionLoadError";

interface DinkesProps {
  onWilayah: (w: string) => void;
}

export function Dinkes({ onWilayah }: DinkesProps) {
  const { terurut, kosong, isError, isLoading, refetch, sumber } = useDinkes();

  return (
    <PageScroll>
      <PageHead
        title="Pantauan Wilayah"
        art="dinkes"
        sub="Ringkasan per wilayah tanpa data pasien, untuk menentukan faskes yang perlu dibina."
      />
      {sumber && <BannerSintetis sumber={sumber} />}
      {isLoading && (
        <p role="status" className="text-sm text-[#56657A]">
          Memuat data wilayah…
        </p>
      )}
      {isError && <RegionLoadError onRetry={() => refetch()} />}
      {!isLoading && !isError && kosong && (
        <p className="text-sm text-[#56657A]">
          Belum ada rujukan yang dinilai. Rujukan yang sudah dinilai akan muncul
          di sini per wilayah.
        </p>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {terurut.map((w) => (
          <RegionCard key={w.wilayah} wilayah={w} onSelect={onWilayah} />
        ))}
      </div>
    </PageScroll>
  );
}
