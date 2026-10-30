interface EmptyStateProps {
  title: string;
  body?: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="p-6 text-center">
      <p className="font-semibold text-[#0E1B2A]">{title}</p>
      {body && <p className="mt-1 text-sm text-[#56657A]">{body}</p>}
    </div>
  );
}
