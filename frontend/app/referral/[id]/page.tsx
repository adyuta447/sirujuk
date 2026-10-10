import SirujukPage from "../../../components/pages/SirujukPage";

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SirujukPage initialView="detail" initialId={id} />;
}
