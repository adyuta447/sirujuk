import type { ReferralInput } from "../lib/validate";

export interface FieldDef {
  name: keyof ReferralInput;
  label: string;
  placeholder: string;
}

export interface ReasonOption {
  teks: string;
  kategori: NonNullable<ReferralInput["reason_category"]>;
}
