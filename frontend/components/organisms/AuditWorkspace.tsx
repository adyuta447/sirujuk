"use client";
import { useEffect, useState } from "react";
import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { RiskBadge } from "../atoms/RiskBadge";
import { Illustration } from "../atoms/Illustration";
import type { Keputusan, RiskLevel, RujukanCase } from "../../lib/sirujuk-data";
import { AUDIT_CHECKLIST, NAVY, RISK } from "../../lib/sirujuk-data";
import { useReferrals } from "../../hooks/useReferral";
import { formatVerifierDate, maskPasien } from "../../lib/formatters";

export const AuditView = ({
  kasus,
  onDone,
  onSelect,
  onKlarifikasi,
}: {
  kasus: RujukanCase | null;
  onDone: () => void;
  onSelect: (c: RujukanCase) => void;
  onKlarifikasi: (c: RujukanCase) => void;
}) => {
  const [keputusan, setKeputusan] = useState<Keputusan | null>(null);
  const [catatan, setCatatan] = useState("");
  const [checks, setChecks] = useState<boolean[]>(
    AUDIT_CHECKLIST.map(() => false),
  );
  const [submitted, setSubmitted] = useState(false);
  const { data: referrals = [], isError } = useReferrals();

  useEffect(() => {
    if (!submitted || keputusan === "perlu-klarifikasi") return;
    const timeout = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timeout);
  }, [keputusan, onDone, submitted]);

  if (!kasus) {
    const pending = referrals.filter((c) => c.status !== "selesai");
    return (
      <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <PageHead
          title="Audit"
          sub="Pilih rujukan yang akan diperiksa."
          art="audit"
        />
        {isError && (
          <p role="alert" className="text-sm text-[#9B1C1C]">
            Rujukan gagal dimuat. Coba muat ulang halaman.
          </p>
        )}
        <div className="bg-white rounded-4xl border border-[#DCE3EC] divide-y divide-[#EEF1F5] overflow-hidden">
          {pending.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">
                  {maskPasien(c.noRujukan)}
                </div>
                <div className="text-xs text-[#56657A] truncate">
                  {c.diagnosa}
                </div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
              <ChevronRight size={16} className="text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div role="status" className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-52 h-40 mb-4">
          <Illustration name="selesai" className="w-full h-full" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1B2A] mb-2">
          Keputusan tersimpan
        </h2>
        <p className="text-sm text-[#56657A] max-w-xs">
          Keputusan untuk {kasus.noRujukan} sudah dicatat.
        </p>
        {keputusan === "perlu-klarifikasi" && (
          <button
            type="button"
            onClick={() => onKlarifikasi(kasus)}
            className="mt-4 min-h-11 px-5 py-3 text-white font-semibold rounded-4xl bg-[#1E3A5F] hover:bg-[#16304F]"
          >
            Kirim permintaan klarifikasi ke dokter
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-3 min-h-11 px-5 py-2 text-sm font-semibold text-[#56657A]"
        >
          Kembali ke antrean
        </button>
      </div>
    );
  }

  const options: {
    value: Keputusan;
    label: string;
    desc: string;
    level: RiskLevel;
  }[] = [
    {
      value: "valid",
      label: "Rujukan aman",
      desc: "Rujukan sesuai prosedur dan alasan medisnya jelas.",
      level: "rendah",
    },
    {
      value: "perlu-klarifikasi",
      label: "Perlu diklarifikasi",
      desc: "Data belum cukup, perlu konfirmasi ke fasilitas.",
      level: "sedang",
    },
    {
      value: "tidak-valid",
      label: "Rujukan tidak sesuai",
      desc: "Ada prosedur yang belum terpenuhi atau pola yang perlu ditindaklanjuti.",
      level: "tinggi",
    },
  ];

  const canSubmit = keputusan && catatan.trim().length > 0;

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5">
        <PageHead
          title="Cek rujukan"
          sub={`${maskPasien(kasus.noRujukan)} (${kasus.noRujukan})`}
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_23.75rem] gap-5 items-start">
          <div className="space-y-5">
        <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm text-[#0E1B2A]">
              Daftar periksa
            </div>
            <span
              className="text-xs font-semibold"
              style={{
                color: checks.every(Boolean) ? RISK.rendah.text : "#64748B",
              }}
            >
              {checks.filter(Boolean).length} dari {AUDIT_CHECKLIST.length}{" "}
              selesai
            </span>
          </div>
          <div className="space-y-1">
            {AUDIT_CHECKLIST.map((item, i) => (
              <label
                key={i}
                className="flex items-center gap-3 min-h-11 cursor-pointer rounded-4xl focus-within:outline focus-within:outline-2 focus-within:outline-[#1E3A5F]"
              >
                <span
                  className="w-5 h-5 rounded-4xl border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={
                    checks[i]
                      ? {
                          backgroundColor: NAVY,
                          borderColor: NAVY,
                          color: "#fff",
                        }
                      : { borderColor: "#C4CFDC", color: "transparent" }
                  }
                >
                  <Check size={13} />
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checks[i]}
                  onChange={() =>
                    setChecks((p) => p.map((v, idx) => (idx === i ? !v : v)))
                  }
                />
                <span className="text-sm text-[#0E1B2A]">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="text-sm font-bold text-[#0E1B2A]">
            Pilih keputusan
          </div>
          {options.map((opt) => {
            const on = keputusan === opt.value;
            const c = RISK[opt.level];
            return (
              <label
                key={opt.value}
                className="flex items-start gap-3.5 p-4 rounded-4xl border-2 cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1E3A5F]"
                style={
                  on
                    ? { backgroundColor: c.solid, borderColor: c.solid }
                    : { backgroundColor: "#fff", borderColor: "#DCE3EC" }
                }
              >
                <input
                  type="radio"
                  name="keputusan"
                  className="sr-only"
                  checked={on}
                  onChange={() => setKeputusan(opt.value)}
                />
                <span
                  className="mt-0.5 w-5 h-5 rounded-4xl border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: on ? "#fff" : "#C4CFDC" }}
                >
                  {on && (
                    <span
                      className="w-2.5 h-2.5 rounded-4xl"
                      style={{ backgroundColor: "#fff" }}
                    />
                  )}
                </span>
                <div>
                  <div className="font-bold text-sm" style={{ color: on ? "#fff" : "#0E1B2A" }}>
                    {opt.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: on ? "#fff" : "#56657A" }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="catatan-verifikator"
            className="text-sm font-bold text-[#0E1B2A]"
          >
            Catatan alasan <span style={{ color: RISK.tinggi.solid }}>*</span>
          </label>
          <textarea
            id="catatan-verifikator"
            aria-required="true"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tulis alasan keputusan atau langkah berikutnya."
            className="w-full h-32 px-4 py-3 text-sm text-[#0E1B2A] bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]"
          />
        </div>

          </div>
          <aside className="space-y-5 lg:sticky lg:top-0">
        <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-bold text-[#0E1B2A]">Ringkasan rujukan</div>
            <RiskBadge level={kasus.risk} score={kasus.riskScore} />
          </div>
          <dl className="space-y-3 text-sm">
            {[
              ["Diagnosis", kasus.diagnosa],
              ["Dari", kasus.fasalOrigin],
              ["Dirujuk ke", kasus.fasalTujuan],
              ["Dokter", kasus.dokter],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-[#56657A]">{k}</dt>
                <dd className="font-semibold text-[#0E1B2A]">{v}</dd>
              </div>
            ))}
          </dl>
          {kasus.alasan.length > 0 && (
            <div className="pt-4 border-t border-[#EEF1F5]">
              <div className="text-xs text-[#56657A] mb-2">Alasan ditandai</div>
              <ul className="space-y-2 text-sm text-[#0E1B2A] list-disc pl-4">
                {kasus.alasan.map((a) => (
                  <li key={a.judul}>{a.judul}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className="rounded-4xl px-4 py-3 flex items-start gap-2.5 text-sm"
          style={{ backgroundColor: RISK.sedang.solid, color: "#FFFFFF" }}
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-bold">
              Skor hanya menunjukkan prioritas.
            </span>{" "}
            Keputusan akhir ada pada kamu, bukan pada skor.
          </span>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3 rounded-4xl text-sm"
          style={{ backgroundColor: "#fff", border: "1px solid #DCE3EC" }}
        >
          <div
            className="w-8 h-8 rounded-4xl flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: NAVY }}
          >
            AS
          </div>
          <div>
            <div className="font-semibold text-[#0E1B2A]">Adit Suryanto</div>
            <div className="text-xs text-[#56657A]">
              Verifikator senior, {formatVerifierDate(new Date())} WIB
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pb-2">
          <button
            type="button"
            onClick={() => {
              if (canSubmit) setSubmitted(true);
            }}
            disabled={!canSubmit}
            className="flex-1 py-3.5 text-white font-bold rounded-4xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSubmit ? NAVY : "#9AA8BA" }}
          >
            <Check size={18} /> Simpan keputusanku
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-5 py-3.5 border border-[#DCE3EC] bg-white text-[#56657A] font-semibold rounded-4xl hover:bg-[#F8FAFC] transition-colors"
          >
            Batal
          </button>
        </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
