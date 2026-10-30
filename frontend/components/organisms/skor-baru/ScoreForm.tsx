import type { FormEvent } from "react";
import { FIELD } from "../../../data/skor-fields";
import { Card } from "../../atoms/Card";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { TextField } from "../../molecules/TextField";
import { NarrativeField } from "./NarrativeField";
import { ReasonSelect } from "./ReasonSelect";

interface ScoreFormProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  kosong: boolean;
  isPending: boolean;
}

export function ScoreForm({ onSubmit, kosong, isPending }: ScoreFormProps) {
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELD.map((x) => (
            <TextField key={x.name} id={x.name} label={x.label} placeholder={x.placeholder} autoComplete="off" />
          ))}
        </div>
        <ReasonSelect />
        <NarrativeField />
        {kosong && <p role="alert" className="text-sm text-[#C42222]">Semua kolom bertanda wajib harus diisi dulu.</p>}
        <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto px-8 py-3.5">
          {isPending ? "Menghitung skor…" : "Hitung skor"}
        </PrimaryButton>
      </form>
    </Card>
  );
}
