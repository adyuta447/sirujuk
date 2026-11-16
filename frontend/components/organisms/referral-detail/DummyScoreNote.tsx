import { LABEL_SKOR_SEMENTARA } from "../../../data/skor-sementara";

export function DummyScoreNote() {
  return (
    <p role="note" className="px-5 py-4 text-sm text-[#56657A] leading-relaxed">
      <span className="font-bold text-[#0E1B2A]">{LABEL_SKOR_SEMENTARA}.</span> Alasan dari model belum ada, jadi periksa
      rujukan ini secara manual.
    </p>
  );
}
