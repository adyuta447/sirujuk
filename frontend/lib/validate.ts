// Mirrors backend-go/internal/handler/validate.go. Client checks are UX only; the backend is the authority.
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;
const DIAGNOSIS = /^[A-Za-z][A-Za-z0-9.]{0,9}$/;
// control (Cc), format/bidi/zero-width (Cf), private use (Co), replacement char
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Co}�]/u;

export type ReferralInput = {
  referral_no: string;
  doctor_id: string;
  origin_facility_id: string;
  destination_facility_id: string;
  diagnosis_code: string;
  reason: string;
  clinical_narrative: string;
  reason_category?: "clinical" | "equipment" | "staff";
};

function badText(s: string, max: number, required: boolean, multiline: boolean) {
  const n = [...s].length;
  if ((required && !s.trim()) || n > max) return true;
  if (!multiline) return FORBIDDEN.test(s);
  return FORBIDDEN.test(s.replace(/[\n\t]/g, ""));
}

/** Returns an error message, or null when valid. Never echoes the input back. */
export function validateReferral(i: ReferralInput): string | null {
  if (![i.referral_no, i.doctor_id, i.origin_facility_id, i.destination_facility_id].every((v) => ID.test(v)))
    return "ID hanya boleh huruf, angka, titik, titik dua, garis miring, atau tanda hubung (maks 64).";
  if (!DIAGNOSIS.test(i.diagnosis_code)) return "Kode diagnosis tidak valid.";
  if (badText(i.reason, 200, true, false)) return "Alasan rujukan kosong, terlalu panjang, atau memuat karakter tidak diizinkan.";
  if (badText(i.clinical_narrative, 4000, true, true)) return "Narasi klinis kosong, terlalu panjang, atau memuat karakter tidak diizinkan.";
  return null;
}
