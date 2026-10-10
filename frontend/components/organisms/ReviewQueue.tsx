'use client'
import { useState } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { PageHead } from '../atoms/PageHead'
import { PrimaryButton } from '../atoms/PrimaryButton'
import { RiskBadge } from '../atoms/RiskBadge'
import { StatusBadge } from '../atoms/StatusBadge'
import { ClaimBadge } from '../atoms/ClaimBadge'
import { Illustration } from '../atoms/Illustration'
import type { RiskLevel, RujukanCase } from '../../lib/sirujuk-data'
import { NAVY, RISK } from '../../lib/sirujuk-data'
import { cocokCari } from "../../lib/formatters";
import { useReferrals } from '../../hooks/useReferral'
import { useAuditQueue } from '../../hooks/useAuditQueue'

export const QueueView = ({ onSelect, wilayah, query }: { onSelect: (c: RujukanCase) => void; wilayah: string; query: string }) => {
  const [filter, setFilter] = useState<RiskLevel | 'semua'>('semua')
  const { data: referrals = [], isError, isLoading } = useReferrals()
  const cari = referrals.filter(c => cocokCari(c, query))
  const { base, filtered, counts } = useAuditQueue(cari, wilayah, filter)

  const segments: { key: RiskLevel | 'semua'; label: string; count: number }[] = [
    { key: 'semua', label: 'Semua', count: base.length },
    { key: 'tinggi', label: 'Tinggi', count: counts.tinggi },
    { key: 'sedang', label: 'Sedang', count: counts.sedang },
    { key: 'rendah', label: 'Rendah', count: counts.rendah },
  ]

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <PageHead title="Antrean Cek" sub="Data dummy dari backend, diurutkan dari skor tertinggi. Skor heuristik, bukan evaluasi kecurangan." art="antrean-kosong" />
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Antrean gagal dimuat. Coba muat ulang halaman.</p>}

      <div className="flex items-center gap-1.5 flex-wrap">
        {segments.map(s => {
          const on = filter === s.key
          return (
            <button
              type="button"
              key={s.key}
              onClick={() => setFilter(s.key)}
              className="inline-flex items-center gap-2 min-h-11 pl-3 pr-2 py-2 rounded-4xl text-sm font-semibold border transition-colors"
              style={on ? { backgroundColor: NAVY, color: '#fff', borderColor: NAVY } : { backgroundColor: '#fff', color: '#56657A', borderColor: '#DCE3EC' }}
            >
              {s.key !== 'semua' && <span className="w-2 h-2 rounded-4xl" style={{ backgroundColor: RISK[s.key].solid }} />}
              {s.label}
              <span className="font-mono text-xs px-1.5 py-0.5 rounded-4xl" style={on ? { backgroundColor: '#3A5880' } : { backgroundColor: '#F4F6F9' }}>{s.count}</span>
            </button>
          )
        })}
      </div>

      {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat antrean…</p>}
      {!isLoading && filtered.length === 0 ? (
        <div className="bg-white rounded-4xl border border-[#DCE3EC] py-12 flex flex-col items-center text-center">
          <div className="w-44 h-32"><Illustration name="antrean-kosong" className="w-full h-full" /></div>
          <div className="font-bold text-[#0E1B2A] mt-4">Tidak ada rujukan</div>
          <p className="text-sm text-[#56657A] mt-1 max-w-sm">Coba kategori lain atau pilih Semua.</p>
        </div>
      ) : (
      <div className="space-y-4">
        {filtered.map((c) => (
          <article
            key={c.id}
            className="bg-white rounded-4xl border border-[#DCE3EC] px-5 sm:px-7 py-5 sm:py-6 hover:border-[#1E3A5F] transition-colors flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: RISK[c.risk].solid }}>{RISK[c.risk].label}</span>
                <span className="font-mono text-xs text-[#64748B]">Skor {c.riskScore}</span>
                <StatusBadge status={c.status} />
                <ClaimBadge status={c.claimStatus} />
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0E1B2A] mt-3">{c.pasien}</h3>

              <p className="text-sm text-[#56657A] mt-1.5 leading-relaxed">
                {c.usia ? `${c.usia} tahun, ` : ""}dari {c.wilayah}, dirujuk ke <span className="font-semibold text-[#0E1B2A]">{c.fasalTujuan}</span>
              </p>

              {c.alasan.length > 0 && (
                <p className="text-sm text-[#56657A] mt-4 leading-relaxed">
                  <span className="font-semibold text-[#0E1B2A]">Kenapa perlu dicek: </span>
                  {c.alasan[0].judul}{c.alasan.length > 1 ? `, dan ${c.alasan.length - 1} alasan lain` : ''}
                </p>
              )}
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {c.status !== 'selesai' ? (
                <PrimaryButton onClick={() => onSelect(c)} className="w-full sm:w-auto px-5 py-2.5 text-sm whitespace-nowrap">
                  Cek rujukan <ChevronRight size={16} />
                </PrimaryButton>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#56657A]"><Check size={16} /> Selesai</span>
              )}
            </div>
          </article>
        ))}
      </div>
      )}
    </div>
  )
}

// Detail View
