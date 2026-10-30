import type { FieldDef } from "../types/skor";

export const FIELD: FieldDef[] = [
  { name: "referral_no", label: "No. rujukan", placeholder: "RJK-2026-0001" },
  { name: "doctor_id", label: "ID dokter", placeholder: "d-001" },
  { name: "origin_facility_id", label: "ID faskes asal", placeholder: "fktp-001" },
  { name: "destination_facility_id", label: "ID faskes tujuan", placeholder: "fkrtl-001" },
  { name: "diagnosis_code", label: "Kode diagnosis (ICD-10)", placeholder: "I10" },
];
