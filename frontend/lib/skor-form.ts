import { ALASAN } from "../data/skor-reasons";
import { FIELD } from "../data/skor-fields";
import type { ReferralInput } from "./validate";

/** Baca form skor; null bila ada kolom wajib kosong atau alasan tidak dipilih. */
export function bacaInputSkor(form: FormData): ReferralInput | null {
  const v = (k: string) => String(form.get(k) ?? "").trim();
  // Pilihan alasan berisi kategori; teks alasan dan kategori dikirim bersama supaya backend tidak menebak.
  const pilihan = ALASAN.find((x) => x.kategori === v("reason"));
  if (!pilihan || FIELD.some((x) => !v(x.name))) return null;
  return {
    referral_no: v("referral_no"),
    doctor_id: v("doctor_id"),
    origin_facility_id: v("origin_facility_id"),
    destination_facility_id: v("destination_facility_id"),
    diagnosis_code: v("diagnosis_code"),
    reason: pilihan.teks,
    reason_category: pilihan.kategori,
    clinical_narrative: v("clinical_narrative"),
  };
}
