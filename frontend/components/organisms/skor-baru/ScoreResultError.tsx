interface ScoreResultErrorProps {
  message: string;
  onClose: () => void;
}

export function ScoreResultError({ message, onClose }: ScoreResultErrorProps) {
  return (
    <div role="alert" className="mt-3 text-sm">
      <p className="text-[#C42222] font-semibold">{message}</p>
      <p className="text-[#56657A] mt-1">
        Rujukan tetap berjalan seperti biasa. Coba lagi sebentar lagi.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 min-h-11 font-bold text-[#1E3A5F] underline underline-offset-2"
      >
        Tutup
      </button>
    </div>
  );
}
