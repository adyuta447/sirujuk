interface LoadingStateProps {
  label: string;
}

// Teks datang dari pemanggil supaya menyebut sebab dan langkah berikutnya.
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <p role="status" className="p-6 text-sm text-[#56657A]">
      {label}…
    </p>
  );
}
