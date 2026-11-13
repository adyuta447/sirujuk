import type { IdParams } from "../../../types/route";
import { SirujukPage } from "../../../components/pages/SirujukPage";

export default async function KlarifikasiDetailPage({ params }: IdParams) {
  const { id } = await params;
  return <SirujukPage initialView="klarifikasi" initialId={id} />;
}
