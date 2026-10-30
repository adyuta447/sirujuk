import type { IdParams } from "../../../types/route";
import { SirujukPage } from "../../../components/pages/SirujukPage";

export default async function DokterDetailPage({ params }: IdParams) {
  const { id } = await params;
  return <SirujukPage initialView="dokter" initialId={id} />;
}
