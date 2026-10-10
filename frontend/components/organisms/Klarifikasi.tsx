"use client";
import { useState } from "react";
import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { RiskBadge } from "../atoms/RiskBadge";
import { useReferrals } from "../../hooks/useReferral";
import { maskPasien } from "../../lib/formatters";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { INDIKATOR_DEMO } from "../../lib/sirujuk-data";

// Tampilan untuk dokter FKTP: mobile first, nadanya sopan dan tidak menuduh.
export const Klarifikasi = ({
  kasus,
  onPilih,
  onDetail,
  onDokter,
}: {
  kasus?: RujukanCase;
  onPilih: (c: RujukanCase) => void;
  onDetail: (c: RujukanCase) => void;
  onDokter: (nama: string) => void;
}) => {
  const [jawaban, setJawaban] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const { data: referrals = [] } = useReferrals();

  if (!kasus) {
    const list = referrals.filter((c) => c.risk !== "rendah" && c.status !== "selesai");
    return (
      <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <PageHead
          title="Klarifikasi"
          art="klarifikasi"
          sub="Pilih rujukan yang memerlukan penjelasan dari dokter."
        />
        {list.length === 0 && <p className="text-sm text-[#56657A]">Tidak ada permintaan klarifikasi.</p>}
        <div className="bg-white rounded-4xl border border-[#DCE3EC] divide-y divide-[#EEF1F5] overflow-hidden">
          {list.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onPilih(c)}
              className="w-full min-h-11 flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">{c.dokter}</div>
                <div className="text-xs text-[#56657A] truncate">{maskPasien(c.noRujukan)} · {c.diagnosa}</div>
              </div>
              <RiskBadge level={c.risk} />
              <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (terkirim) {
    return (
      <div role="status" className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1B2A]">Penjelasan terkirim</h2>
        <p className="text-sm text-[#56657A] max-w-sm">
          Penjelasan untuk {kasus.noRujukan} akan dibaca verifikator. Tidak ada tindak lanjut sebelum ditinjau manusia.
        </p>
        <PrimaryButton onClick={() => onDetail(kasus)} className="px-5 py-3">
          Lihat detail rujukan <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="space-y-5">
        <PageHead
          title={`Yth. ${kasus.dokter}`}
          sub="Ada rujukan Anda yang perlu kami pahami lebih lanjut. Mohon berikan penjelasan singkat."
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem] gap-5 items-start">
          <div className="space-y-5">
            <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5">
              <div className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">Kenapa rujukan ini ditandai</div>
              <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {kasus.alasan.map((a) => (
                  <div key={a.judul}>
                    <div className="font-semibold text-[#0E1B2A]">{a.judul}</div>
                    <p className="text-sm text-[#56657A] mt-0.5 leading-relaxed">{a.penjelasan}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5">
              <div className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">Angka yang dipakai</div>
              <ul className="mt-3 divide-y divide-[#EEF1F5]">
                {INDIKATOR_DEMO.map((i) => (
                  <li key={i.label} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-sm text-[#0E1B2A]">{i.label}</div>
                      <div className="text-xs text-[#56657A] mt-0.5">{i.banding}</div>
                    </div>
                    <span className="font-mono font-extrabold text-lg text-[#0E1B2A] shrink-0">{i.nilai}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-0">
            <p className="flex items-start gap-2.5 rounded-4xl px-4 py-3 text-sm bg-[#17803F] text-white">
              <ShieldCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              Ini bukan tuduhan. Tidak ada sanksi sebelum penjelasan Anda ditinjau manusia.
            </p>

            <div className="bg-white rounded-4xl border border-[#DCE3EC] p-5 space-y-3">
              <label htmlFor="jawaban-dokter" className="text-xl font-extrabold tracking-tight text-[#0E1B2A] block">
                Penjelasan Anda <span className="text-[#C42222]">*</span>
              </label>
              <textarea
                id="jawaban-dokter"
                aria-required="true"
                value={jawaban}
                onChange={(e) => setJawaban(e.target.value)}
                placeholder="Contoh: alat di puskesmas rusak, atau hanya ada satu RS yang terjangkau."
                className="w-full h-44 px-4 py-3 text-sm bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]"
              />
              <p className="text-xs text-[#56657A]">Batas menjawab: 7 hari kerja sejak pesan ini diterima.</p>
              <PrimaryButton
                onClick={() => setTerkirim(true)}
                disabled={jawaban.trim().length === 0}
                className="w-full py-3.5"
              >
                Kirim penjelasan
              </PrimaryButton>
              <button
                type="button"
                onClick={() => onDokter(kasus.dokter)}
                className="w-full min-h-11 px-5 py-3 border border-[#DCE3EC] bg-white text-[#56657A] font-semibold rounded-4xl hover:bg-[#F8FAFC]"
              >
                Lihat profil dokter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
