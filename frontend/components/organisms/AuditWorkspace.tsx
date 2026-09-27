"use client";
import { useEffect, useState } from "react";
import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { RiskBadge } from "../atoms/RiskBadge";
import { IllustrationAudit, IllustrationDone } from "../atoms/Illustrations";
import type { Keputusan, RiskLevel, RujukanCase } from "../../lib/sirujuk-data";
import { AUDIT_CHECKLIST, NAVY, RISK } from "../../lib/sirujuk-data";
import { useReferrals } from "../../hooks/useReferral";
import { formatVerifierDate } from "../../lib/formatters";

export const AuditView = ({
  kasus,
  onDone,
  onSelect,
}: {
  kasus: RujukanCase | null;
  onDone: () => void;
  onSelect: (c: RujukanCase) => void;
}) => {
  const [keputusan, setKeputusan] = useState<Keputusan | null>(null);
  const [catatan, setCatatan] = useState("");
  const [checks, setChecks] = useState<boolean[]>(
    AUDIT_CHECKLIST.map(() => false),
  );
  const [submitted, setSubmitted] = useState(false);
  const { data: referrals = [], isError } = useReferrals();

  useEffect(() => {
    if (!submitted) return;
    const timeout = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timeout);
  }, [onDone, submitted]);

  if (!kasus) {
    const pending = referrals.filter((c) => c.status !== "selesai");
    return (
      <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-5">
        <PageHead
          eyebrow="Ruang audit"
          title="Audit"
          sub="Pilih rujukan yang mau kamu cek lebih lanjut."
        />
        {isError && (
          <p role="alert" className="text-sm text-[#9B1C1C]">
            Rujukan belum bisa dimuat. Coba lagi sebentar.
          </p>
        )}
        <div className="bg-white rounded-4xl border border-[#DCE3EC] p-8 flex flex-col items-center text-center">
          <div className="w-52 h-40">
            <IllustrationAudit />
          </div>
          <div className="font-bold text-[#0E1B2A] mt-2">
            Belum ada yang dipilih
          </div>
          <p className="text-sm text-[#56657A] mt-1 max-w-sm">
            Pilih rujukan yang masih menunggu keputusan di bawah buat mulai.
          </p>
        </div>
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
                  {c.pasien}
                </div>
                <div className="text-xs text-[#56657A] truncate">
                  {c.diagnosa}
                </div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
              <ChevronRight size={16} className="text-[#8A98AC]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-52 h-40 mb-4">
          <IllustrationDone />
        </div>
        <h2 className="text-2xl font-extrabold text-[#0E1B2A] mb-2">
          Sip, sudah tersimpan!
        </h2>
        <p className="text-sm text-[#56657A] max-w-xs">
          Keputusan untuk {kasus.noRujukan} sudah kami catat. Balik ke antrean,
          ya.
        </p>
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
    <div className="scroll-area flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-5">
        <PageHead
          eyebrow="Ruang audit"
          title="Cek rujukan"
          sub={`${kasus.pasien} (${kasus.noRujukan})`}
        />

        <div
          className="rounded-4xl px-4 py-3 flex items-start gap-2.5 text-sm"
          style={{ backgroundColor: RISK.sedang.soft, color: RISK.sedang.text }}
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-bold">
              Kami bantu tunjukkan prioritasnya.
            </span>{" "}
            Keputusan akhir tetap di tangan kamu, bukan di skor risikonya.
          </span>
        </div>

        <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm text-[#0E1B2A]">
              Checklist dulu
            </div>
            <span
              className="text-xs font-semibold"
              style={{
                color: checks.every(Boolean) ? RISK.rendah.text : "#8A98AC",
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
                className="flex items-center gap-3 py-1.5 cursor-pointer"
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
                className="flex items-start gap-3.5 p-4 rounded-4xl border-2 cursor-pointer transition-colors"
                style={
                  on
                    ? { backgroundColor: c.soft, borderColor: c.solid }
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
                  style={{ borderColor: on ? c.solid : "#C4CFDC" }}
                >
                  {on && (
                    <span
                      className="w-2.5 h-2.5 rounded-4xl"
                      style={{ backgroundColor: c.solid }}
                    />
                  )}
                </span>
                <div>
                  <div className="font-bold text-sm text-[#0E1B2A]">
                    {opt.label}
                  </div>
                  <div className="text-xs text-[#56657A] mt-0.5">
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
            Catatan kamu <span style={{ color: RISK.tinggi.solid }}>*</span>
          </label>
          <textarea
            id="catatan-verifikator"
            aria-required="true"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tulis alasan keputusan atau langkah berikutnya di sini."
            className="w-full h-32 px-4 py-3 text-sm text-[#0E1B2A] bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#8A98AC]"
          />
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3 rounded-4xl text-sm"
          style={{ backgroundColor: "#E7ECF3" }}
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
              Senior verifier, {formatVerifierDate(new Date())}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pb-2">
          <button
            type="button"
            onClick={() => {
              if (canSubmit) setSubmitted(true);
            }}
            disabled={!canSubmit}
            className="flex-1 py-3.5 text-white font-bold rounded-4xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: NAVY }}
          >
            <Check size={18} /> Simpan keputusan
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-5 py-3.5 border border-[#DCE3EC] text-[#56657A] font-semibold rounded-4xl hover:bg-white transition-colors"
          >
            Nanti dulu
          </button>
        </div>
      </div>
    </div>
  );
};
