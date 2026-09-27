export function PageHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#1E3A5F" }}>
          {eyebrow}
        </div>
      )}
      <h1 className="text-2xl font-extrabold text-[#0E1B2A] tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-[#56657A] mt-1">{sub}</p>}
    </div>
  );
}
