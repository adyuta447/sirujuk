import { PrimaryButton } from "./PrimaryButton";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="p-6 flex flex-col items-start gap-3">
      <p className="text-sm text-[#9B1C1C]">{message}</p>
      <PrimaryButton onClick={onRetry} className="px-5">
        Coba lagi
      </PrimaryButton>
    </div>
  );
}
