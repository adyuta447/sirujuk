import type { Keputusan, RujukanCase } from "../../../lib/sirujuk-data";
import { Illustration } from "../../atoms/Illustration";
import { PrimaryButton } from "../../atoms/PrimaryButton";

interface AuditSavedProps {
  kasus: RujukanCase;
  keputusan: Keputusan | null;
  onKlarifikasi: (c: RujukanCase) => void;
  onDone: () => void;
}

export function AuditSaved({
  kasus,
  keputusan,
  onKlarifikasi,
  onDone,
}: AuditSavedProps) {
  return (
    <div
      role="status"
      className="flex-1 flex flex-col items-center justify-center p-10 text-center"
    >
      <div className="w-52 h-40 mb-4">
        <Illustration name="selesai" className="w-full h-full" />
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1B2A] mb-2">
        Keputusan tersimpan
      </h2>
      <p className="text-sm text-[#56657A] max-w-xs">
        Keputusan untuk {kasus.noRujukan} sudah dicatat.
      </p>
      {keputusan === "perlu-klarifikasi" && (
        <PrimaryButton
          onClick={() => onKlarifikasi(kasus)}
          className="mt-4 px-5 py-3"
        >
          Kirim permintaan klarifikasi ke dokter
        </PrimaryButton>
      )}
      <button
        type="button"
        onClick={onDone}
        className="mt-3 min-h-11 px-5 py-2 text-sm font-semibold text-[#56657A]"
      >
        Kembali ke antrean
      </button>
    </div>
  );
}
