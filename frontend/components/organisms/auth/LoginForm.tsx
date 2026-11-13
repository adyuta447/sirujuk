import type { AuthFormState } from "../../../hooks/useAuthForm";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { TextField } from "../../molecules/TextField";
import { PasswordField } from "./PasswordField";

interface LoginFormProps {
  auth: AuthFormState;
}

export function LoginForm({ auth: { kirim, galat, proses } }: LoginFormProps) {
  return (
    <form onSubmit={kirim} noValidate className="mt-8 space-y-5">
      <TextField id="email" label="Email" type="email" autoComplete="username" placeholder="nama@instansi.go.id" />
      <PasswordField />
      {galat && <p role="alert" className="text-sm font-semibold text-[#C42222]">{galat}</p>}
      <PrimaryButton type="submit" disabled={proses} className="w-full py-3.5 text-base">
        {proses ? "Memeriksa…" : "Masuk"}
      </PrimaryButton>
    </form>
  );
}
