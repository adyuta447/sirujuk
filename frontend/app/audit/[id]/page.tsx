import type { IdParams } from "../../../types/route";
import { SirujukPage } from "../../../components/pages/SirujukPage";

export default async function AuditDetailPage({ params }: IdParams) {
  const { id } = await params;
  return <SirujukPage initialView="audit" initialId={id} />;
}
