import { ShieldCheck } from "lucide-react";
import type { ClarificationFormState } from "../../../hooks/useClarificationForm";
import { Card } from "../../atoms/Card";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { SecondaryButton } from "../../atoms/SecondaryButton";

interface AnswerPanelProps {
  form: ClarificationFormState;
  onProfil: () => void;
}

export function AnswerPanel({ form, onProfil }: AnswerPanelProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-0">
      <p className="flex items-start gap-2.5 rounded-4xl px-4 py-3 text-sm bg-[#17803F] text-white">
        <ShieldCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        Ini bukan tuduhan. Tidak ada sanksi sebelum penjelasan Anda ditinjau manusia.
      </p>
      <Card className="p-5 space-y-3">
        <label htmlFor="jawaban-dokter" className="text-xl font-extrabold tracking-tight text-[#0E1B2A] block">
          Penjelasan Anda <span className="text-[#C42222]">*</span>
        </label>
        <textarea
          id="jawaban-dokter"
          aria-required="true"
          value={form.jawaban}
          onChange={(e) => form.setJawaban(e.target.value)}
          placeholder="Contoh: alat di puskesmas rusak, atau hanya ada satu RS yang terjangkau."
          className="w-full h-44 px-4 py-3 text-sm bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]"
        />
        {form.gagal && (
          <p role="alert" className="text-xs text-[#9B1C1C]">
            {form.pesanGagal ?? "Penjelasan belum terkirim."} Penjelasan belum terkirim.
          </p>
        )}
        <PrimaryButton onClick={form.kirim} disabled={!form.bisaKirim} className="w-full py-3.5">
          Kirim penjelasan
        </PrimaryButton>
        <SecondaryButton onClick={onProfil} className="w-full px-5 py-3 justify-center">
          Lihat profil dokter
        </SecondaryButton>
      </Card>
    </div>
  );
}
