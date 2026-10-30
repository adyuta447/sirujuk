import type { RujukanCase } from "../../lib/sirujuk-data";
import { BannerSintetis } from "../atoms/BannerSintetis";

interface ReferralSourceBannerProps {
  referrals: RujukanCase[];
}

/** Penanda asal data bila ada rujukan sintetis atau dari sampel sumber lain. */
export function ReferralSourceBanner({ referrals }: ReferralSourceBannerProps) {
  if (!referrals.some((c) => c.synthetic || c.sumber)) return null;
  return <BannerSintetis sumber={referrals.find((c) => c.sumber)?.sumber} />;
}
