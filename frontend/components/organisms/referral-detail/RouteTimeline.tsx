interface RouteTimelineProps {
  tanggal: string;
  asal: string;
  tujuan: string;
}

export function RouteTimeline({ tanggal, asal, tujuan }: RouteTimelineProps) {
  return (
    <ol className="lg:ml-auto">
      <li className="flex gap-3">
        <div className="flex flex-col items-center">
          <span className="w-4 h-4 rounded-4xl border-4 border-white shrink-0" />
          <span className="w-1 flex-1 min-h-8 bg-[#3A5880]" />
        </div>
        <div className="pb-4">
          <div className="text-[11px] text-[#C9D6E6]">Diperiksa di · {tanggal}</div>
          <div className="text-base font-extrabold leading-tight">{asal}</div>
        </div>
      </li>
      <li className="flex gap-3">
        <span className="w-4 h-4 rounded-4xl bg-white shrink-0 mt-0.5" />
        <div>
          <div className="text-[11px] text-[#C9D6E6]">Lalu dirujuk ke</div>
          <div className="text-base font-extrabold leading-tight">{tujuan}</div>
        </div>
      </li>
    </ol>
  );
}
