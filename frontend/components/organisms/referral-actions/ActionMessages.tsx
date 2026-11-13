import type { ReferralActionsState } from "../../../hooks/useReferralActions";

interface ActionMessagesProps {
  actions: ReferralActionsState;
}

export function ActionMessages({ actions: { galat, gagal, pesanGagal, berhasil } }: ActionMessagesProps) {
  return (
    <>
      {galat && <p role="alert" className="text-xs text-[#9B1C1C]">{galat}</p>}
      {gagal && <p role="alert" className="text-xs text-[#9B1C1C]">{pesanGagal ?? "Aksi gagal."} Data tidak berubah.</p>}
      {berhasil && !gagal && <p role="status" className="text-xs text-[#146134]">Skor diperbarui oleh ML.</p>}
    </>
  );
}
