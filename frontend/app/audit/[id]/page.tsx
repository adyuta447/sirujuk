import SirujukPage from "../../../components/pages/SirujukPage";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SirujukPage initialView="audit" initialId={id} />;
}
