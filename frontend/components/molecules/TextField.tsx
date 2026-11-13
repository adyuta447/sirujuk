import { AUTH_INPUT_CLASS } from "../../lib/ui-classes";

interface TextFieldProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

/** Input teks berlabel; `id` juga dipakai sebagai `name` untuk FormData. */
export function TextField({ id, label, type = "text", autoComplete, placeholder }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-[#0E1B2A] mb-1.5">{label}</label>
      <input id={id} name={id} type={type} autoComplete={autoComplete} placeholder={placeholder} className={AUTH_INPUT_CLASS} />
    </div>
  );
}
