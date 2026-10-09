'use client'
import { useState } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { PageHead } from '../atoms/PageHead'
import { PrimaryButton } from '../atoms/PrimaryButton'
import { RiskBadge } from '../atoms/RiskBadge'
import { StatusBadge } from '../atoms/StatusBadge'
import { IllustrationEmpty, IllustrationQueue } from '../atoms/Illustrations'
import type { RiskLevel, RujukanCase } from '../../lib/sirujuk-data'
import { NAVY, RISK } from '../../lib/sirujuk-data'
import { useReferrals } from '../../hooks/useReferral'
import { useAuditQueue } from '../../hooks/useAuditQueue'

export const QueueView = ({ onSelect, wilayah }: { onSelect: (c: RujukanCase) => void; wilayah: string }) => {
  const [filter, setFilter] = useState<RiskLevel | 'semua'>('semua')
  const { data: referrals = [], isError } = useReferrals()
  const { base, filtered, counts } = useAuditQueue(referrals, wilayah, filter)

  const segments: { key: RiskLevel | 'semua'; label: string; count: number }[] = [
    { key: 'semua', label: 'Semua', count: base.length },
    { key: 'tinggi', label: 'Tinggi', count: counts.tinggi },
    { key: 'sedang', label: 'Sedang', count: counts.sedang },
    { key: 'rendah', label: 'Rendah', count: counts.rendah },
  ]

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-5">
      <PageHead eyebrow="Antrean kamu" title="Review Queue" sub="Data dummy 50 rujukan dari backend. Skor heuristik, bukan evaluasi fraud." />
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Antrean belum bisa dimuat. Coba lagi sebentar.</p>}

      <div className="rounded-4xl border border-[#DCE3EC] bg-white p-6 flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-[#0E1B2A]">Antreannya gampang dibaca, kok.</div>
          <p className="text-sm text-[#56657A] mt-1">Skor makin tinggi berarti perlu kamu cek lebih dulu. Mulai dari paling atas, ya.</p>
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            {(['tinggi', 'sedang', 'rendah'] as RiskLevel[]).map(k => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-4xl" style={{ backgroundColor: RISK[k].solid }} />
                <span className="text-xs font-semibold text-[#56657A]">{RISK[k].label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-40 h-32 shrink-0 hidden md:block"><IllustrationQueue /></div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {segments.map(s => {
          const on = filter === s.key
          return (
            <button
              type="button"
              key={s.key}
              onClick={() => setFilter(s.key)}
              className="inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-4xl text-sm font-semibold border transition-colors"
              style={on ? { backgroundColor: NAVY, color: '#fff', borderColor: NAVY } : { backgroundColor: '#fff', color: '#56657A', borderColor: '#DCE3EC' }}
            >
              {s.key !== 'semua' && <span className="w-2 h-2 rounded-4xl" style={{ backgroundColor: RISK[s.key].solid }} />}
              {s.label}
              <span className="font-mono text-xs px-1.5 py-0.5 rounded-4xl" style={on ? { backgroundColor: 'rgba(255,255,255,0.18)' } : { backgroundColor: '#F4F6F9' }}>{s.count}</span>
            </button>
          )
        })}
        <div className="ml-auto text-xs text-[#8A98AC]">Urut dari yang paling perlu dicek</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-4xl border border-[#DCE3EC] py-12 flex flex-col items-center text-center">
          <div className="w-44 h-32"><IllustrationEmpty /></div>
          <div className="font-bold text-[#0E1B2A] mt-4">Belum ada rujukan di sini</div>
          <p className="text-sm text-[#56657A] mt-1 max-w-sm">Coba pilih kategori lain, atau balik ke semua rujukan.</p>
        </div>
      ) : (
      <div className="space-y-4">
        {filtered.map((c) => (
          <article
            key={c.id}
            className="bg-white rounded-4xl border border-[#DCE3EC] px-7 py-6 hover:border-[#1E3A5F] transition-colors cursor-pointer flex items-center gap-8"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: RISK[c.risk].solid }}>{RISK[c.risk].label}</span>
                <span className="font-mono text-xs text-[#8A98AC]">Skor {c.riskScore}</span>
                <StatusBadge status={c.status} />
              </div>

              <h3 className="text-xl font-bold text-[#0E1B2A] mt-3">{c.pasien}</h3>

              <p className="text-sm text-[#56657A] mt-1.5 leading-relaxed">
                {c.usia} tahun, dari {c.wilayah}, dirujuk ke <span className="font-semibold text-[#0E1B2A]">{c.fasalTujuan}</span>
              </p>

              {c.alasan.length > 0 && (
                <p className="text-sm text-[#56657A] mt-4 leading-relaxed">
                  <span className="font-semibold text-[#0E1B2A]">Kenapa perlu dicek: </span>
                  {c.alasan[0].judul}{c.alasan.length > 1 ? `, dan ${c.alasan.length - 1} alasan lain` : ''}
                </p>
              )}
            </div>

            <div className="shrink-0">
              {c.status !== 'selesai' ? (
                <PrimaryButton onClick={() => onSelect(c)} className="px-5 py-2.5 text-sm whitespace-nowrap">
                  Cek sekarang <ChevronRight size={16} />
                </PrimaryButton>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#56657A]"><Check size={16} /> Sudah beres</span>
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
