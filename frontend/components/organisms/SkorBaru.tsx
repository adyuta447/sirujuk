"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { PageHead } from "../atoms/PageHead";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { RiskBadge } from "../atoms/RiskBadge";
import { useScoreReferral } from "../../hooks/useScoreReferral";
import { KODE_ALASAN, LEVEL_DARI_KEPUTUSAN } from "../../lib/alasan-skor";
import type { ReferralInput } from "../../lib/validate";

const inputCls =
  "w-full min-h-12 px-4 text-base bg-white border border-[#DCE3EC] rounded-4xl focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]";

const FIELD: { name: keyof ReferralInput; label: string; placeholder: string }[] = [
  { name: "referral_no", label: "No. rujukan", placeholder: "RJK-2026-0001" },
  { name: "doctor_id", label: "ID dokter", placeholder: "d-001" },
  { name: "origin_facility_id", label: "ID faskes asal", placeholder: "fktp-001" },
  { name: "destination_facility_id", label: "ID faskes tujuan", placeholder: "fkrtl-001" },
  { name: "diagnosis_code", label: "Kode diagnosis (ICD-10)", placeholder: "I10" },
];

// Terhubung ke backend lewat proxy Next.js. Data klinis tidak disimpan atau dicatat di browser.
export const SkorBaru = () => {
  const { mutate, data, error, isPending, reset } = useScoreReferral();
  const [kosong, setKosong] = useState(false);

  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: keyof ReferralInput) => String(f.get(k) ?? "").trim();
    const input = Object.fromEntries(
      [...FIELD.map((x) => x.name), "reason", "clinical_narrative"].map((k) => [k, v(k as keyof ReferralInput)]),
    ) as ReferralInput;
    if (FIELD.some((x) => !input[x.name]) || !input.reason) return setKosong(true);
    setKosong(false);
    mutate(input);
  };

  const level = data && data.status === "SCORED" ? LEVEL_DARI_KEPUTUSAN[data.decision] : null;

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <PageHead title="Skor Rujukan" sub="Kirim satu rujukan ke sistem skoring dan lihat hasilnya." art="analitik" />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem] gap-5 items-start">
        <form onSubmit={kirim} noValidate className="bg-white rounded-4xl border border-[#DCE3EC] p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELD.map((x) => (
              <div key={x.name}>
                <label htmlFor={x.name} className="block text-sm font-bold text-[#0E1B2A] mb-1.5">
                  {x.label}
                </label>
                <input id={x.name} name={x.name} placeholder={x.placeholder} autoComplete="off" className={inputCls} />
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">
              Alasan rujukan
            </label>
            <input id="reason" name="reason" maxLength={200} placeholder="Keterbatasan alat" autoComplete="off" className={inputCls} />
          </div>
          <div>
            <label htmlFor="clinical_narrative" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">
              Narasi klinis <span className="font-normal text-[#56657A]">(boleh dikosongkan)</span>
            </label>
            <textarea
              id="clinical_narrative"
              name="clinical_narrative"
              maxLength={4000}
              autoComplete="off"
              className="w-full h-36 px-4 py-3 text-base bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F]"
            />
          </div>
          {kosong && (
            <p role="alert" className="text-sm text-[#C42222]">
              Semua kolom bertanda wajib harus diisi dulu.
            </p>
          )}
          <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto px-8 py-3.5">
            {isPending ? "Menghitung skor…" : "Hitung skor"}
          </PrimaryButton>
        </form>

        <section aria-live="polite" className="bg-white rounded-4xl border border-[#DCE3EC] p-5 lg:sticky lg:top-0">
          <h2 className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">Hasil</h2>
          {!data && !error && !isPending && (
            <p className="text-sm text-[#56657A] mt-2">Hasil skor akan muncul di sini.</p>
          )}
          {isPending && <p className="text-sm text-[#56657A] mt-2">Lagi dihitung…</p>}
          {error && (
            <div role="alert" className="mt-3 text-sm">
              <p className="text-[#C42222] font-semibold">{error.message}</p>
              <p className="text-[#56657A] mt-1">Rujukan tetap berjalan seperti biasa. Coba lagi sebentar lagi.</p>
              <button type="button" onClick={reset} className="mt-3 min-h-11 font-bold text-[#1E3A5F] underline underline-offset-2">
                Tutup
              </button>
            </div>
          )}
          {data && data.status === "ACCEPTED_ASYNC" && (
            <p className="text-sm text-[#56657A] mt-2">
              Skor belum tersedia. Rujukan tetap berjalan dan dinilai menyusul. Tidak ada rujukan yang ditahan karena hal ini.
            </p>
          )}
          {data && level && (
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-3">
                <RiskBadge level={level} />
                <span className="text-sm text-[#56657A]">
                  Skor <span className="font-mono font-extrabold text-2xl text-[#0E1B2A]">{data.score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</span> dari 100
                </span>
              </div>
              {data.reasons && data.reasons.length > 0 && (
                <ul className="space-y-3">
                  {data.reasons.map((r) => (
                    <li key={r.code}>
                      <p className="font-semibold text-[#0E1B2A]">{KODE_ALASAN[r.code] ?? r.code}</p>
                      <p className="text-sm text-[#56657A] mt-0.5">{r.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
              {data.requires_human_review && (
                <p className="rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white">
                  Perlu ditinjau verifikator. Skor ini penunjuk prioritas, bukan bukti kecurangan.
                </p>
              )}
              {data.model_version && <p className="text-xs text-[#56657A]">Versi model: {data.model_version}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
