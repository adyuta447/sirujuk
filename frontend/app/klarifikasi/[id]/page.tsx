import SirujukPage from "../../../components/pages/SirujukPage";

export default async function KlarifikasiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SirujukPage initialView="klarifikasi" initialId={id} />;
}
