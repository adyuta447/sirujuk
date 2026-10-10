import SirujukPage from "../../../components/pages/SirujukPage";

export default async function DokterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SirujukPage initialView="dokter" initialId={id} />;
}
