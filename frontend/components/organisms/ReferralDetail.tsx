'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight, FileText, History, TrendingUp, TriangleAlert } from 'lucide-react'
import { PrimaryButton } from '../atoms/PrimaryButton'
import type { RujukanCase } from '../../lib/sirujuk-data'
import { NAVY, RISK } from '../../lib/sirujuk-data'

export const ReferralDetail = ({ kasus, onBack, onAudit }: { kasus: RujukanCase; onBack: () => void; onAudit: (k: RujukanCase) => void }) => {
  const [open, setOpen] = useState<string | null>('pola')
  const r = RISK[kasus.risk]

  const Section = ({ id, title, Icon, children }: { id: string; title: string; Icon: typeof FileText; children: ReactNode }) => (
    <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
      <button type="button" aria-expanded={open === id} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors" onClick={() => setOpen(open === id ? null : id)}>
        <Icon aria-hidden="true" size={16} className="text-[#56657A]" />
        <span className="font-bold text-sm text-[#0E1B2A]">{title}</span>
        <ChevronRight aria-hidden="true" size={16} className="ml-auto text-[#56657A] transition-transform" style={{ transform: open === id ? 'rotate(90deg)' : 'none' }} />
      </button>
      {open === id && <div className="px-5 pb-5 pt-1 border-t border-[#EEF1F5]">{children}</div>}
    </div>
  )

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#56657A]">
        <button type="button" onClick={onBack} className="hover:text-[#1E3A5F] transition-colors font-medium">Balik ke antrean</button>
        <ChevronRight size={14} />
        <span className="text-[#0E1B2A] font-semibold font-mono">{kasus.noRujukan}</span>
      </div>

      <div className="rounded-4xl p-6 text-white" style={{ backgroundColor: NAVY }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/55">Detail rujukan</div>
            <div className="font-mono text-xs text-white/65 mt-1">{kasus.noRujukan}</div>
            <div className="text-2xl font-extrabold mt-2">{kasus.pasien}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-5 max-w-xl">
              <div>
                <div className="text-[11px] text-white/55">Usia</div>
                <div className="text-sm font-semibold mt-0.5">{kasus.usia} tahun</div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">Jenis peserta</div>
                <div className="text-sm font-semibold mt-0.5">{kasus.jenisPeserta}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">Wilayah</div>
                <div className="text-sm font-semibold mt-0.5">{kasus.wilayah}</div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/15">
              <div className="text-[11px] text-white/55 mb-2">Alur rujukan</div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-medium">{kasus.fasalOrigin}</span>
                <ArrowRight aria-hidden="true" size={15} className="text-white/55" />
                <span className="font-semibold">{kasus.fasalTujuan}</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5">
              <div>
                <div className="text-[11px] text-white/55">Diagnosis</div>
                <div className="text-sm font-semibold mt-0.5">{kasus.diagnosa}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">Dokter perujuk</div>
                <div className="text-sm font-semibold mt-0.5">{kasus.dokter}</div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 rounded-4xl flex flex-col items-center justify-center" aria-label={`${r.label}, skor ${kasus.riskScore}`} style={{ backgroundColor: r.solid }}>
              <span className="font-mono text-3xl font-bold">{kasus.riskScore}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-90">skor</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-white/80">{r.label} · skor dummy</div>
          </div>
        </div>
      </div>

      {/* Why risky, plain human reasons */}
      <div className="bg-white rounded-4xl border-2 overflow-hidden" style={{ borderColor: r.solid }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ backgroundColor: r.soft, color: r.text }}>
          <TriangleAlert size={16} /><span className="font-bold text-sm">Kenapa rujukan ini perlu dicek</span>
        </div>
        {kasus.alasan.length > 0 ? (
          <div className="divide-y divide-[#EEF1F5]">
            {kasus.alasan.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <span className="w-6 h-6 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: r.solid }}>{i + 1}</span>
                <div>
                  <div className="font-semibold text-sm text-[#0E1B2A]">{a.judul}</div>
                  <p className="text-sm text-[#56657A] mt-0.5 leading-relaxed">{a.penjelasan}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm" style={{ color: RISK.rendah.text }}>Aman, belum ada pola yang mencurigakan. Rujukan ini terlihat sesuai prosedur.</p>
        )}
      </div>

      <div className="text-xs font-bold uppercase tracking-wider text-[#8A98AC] pt-1">Biar makin yakin</div>

      <Section id="pola" title="Pola Rujukan Dokter" Icon={TrendingUp}>
        <div className="pt-4 space-y-3">
          <div className="text-sm text-[#56657A] mb-3">Perbandingan {kasus.dokter} dengan dokter lain di wilayah yang sama, 30 hari terakhir.</div>
          {[
            { label: 'Jumlah rujukan', val: '142', peer: 'dokter lain: 61' },
            { label: 'Dikirim ke rumah sakit yang sama', val: '69 dari 100', peer: 'dokter lain: 22 dari 100' },
            { label: 'Rujukan per hari', val: '4,7', peer: 'dokter lain: 2,0' },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center text-sm gap-3">
              <span className="text-[#56657A]">{row.label}</span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] text-[#8A98AC]">{row.peer}</span>
                <span className="font-mono font-semibold text-[#0E1B2A]">{row.val}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="klinis" title="Data Rujukan" Icon={FileText}>
        <div className="pt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {[
            ['Diagnosa', kasus.diagnosa], ['Dokter perujuk', kasus.dokter],
            ['Fasilitas asal', kasus.fasalOrigin], ['Fasilitas tujuan', kasus.fasalTujuan],
            ['Tanggal rujukan', kasus.tanggal], ['Jenis peserta', kasus.jenisPeserta],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-start text-sm gap-3">
              <span className="text-[#56657A]">{label}</span>
              <span className="text-[#0E1B2A] font-medium text-right">{val}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="riwayat" title="Riwayat Pasien" Icon={History}>
        <div className="pt-4 text-sm text-[#56657A] leading-relaxed">
          Dalam 12 bulan terakhir, pasien tidak memiliki catatan rawat inap atau tindakan spesialis di sistem BPJS. Kunjungan hanya tercatat di fasilitas asal.
        </div>
      </Section>

      {kasus.status !== 'selesai' && (
        <div className="sticky bottom-0 bg-[#F4F6F9] pt-3 pb-1">
          <PrimaryButton onClick={() => onAudit(kasus)} className="w-full py-3.5">
              Mulai cek rujukan ini <ArrowRight size={18} />
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}

// Audit Workspace
