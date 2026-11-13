import { Card } from "../../atoms/Card";
import { PrimaryButton } from "../../atoms/PrimaryButton";

interface RegionLoadErrorProps {
  onRetry: () => void;
}

export function RegionLoadError({ onRetry }: RegionLoadErrorProps) {
  return (
    <Card role="alert" className="px-5 py-4 flex flex-wrap items-center gap-3">
      <p className="text-sm text-[#9B1C1C] flex-1 min-w-52">Data wilayah tidak bisa dimuat.</p>
      <PrimaryButton onClick={onRetry} className="px-5 py-2 text-sm">Coba lagi</PrimaryButton>
    </Card>
  );
}
