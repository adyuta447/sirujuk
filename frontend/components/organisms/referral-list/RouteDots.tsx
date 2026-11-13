/** Penanda rute: titik asal, garis, titik tujuan. */
export function RouteDots() {
  return (
    <div className="flex flex-col items-center pt-1.5 pb-1">
      <span className="w-2.5 h-2.5 rounded-4xl border-2 shrink-0" style={{ borderColor: "#8A98AC" }} />
      <span className="w-0.5 flex-1 my-0.5 min-h-[14px]" style={{ backgroundColor: "#DCE3EC" }} />
      <span className="w-2.5 h-2.5 rounded-4xl shrink-0" style={{ backgroundColor: "#1E3A5F" }} />
    </div>
  );
}
