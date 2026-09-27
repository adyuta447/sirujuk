'use client'
import { Inbox, TriangleAlert, ListChecks, Check, ChevronRight, ArrowRight } from 'lucide-react'
import { PageHead } from '../atoms/PageHead'
import { PrimaryButton } from '../atoms/PrimaryButton'
import { RiskBadge } from '../atoms/RiskBadge'
import { IllustrationDecision } from '../atoms/Illustrations'
import type { RujukanCase, View } from '../../lib/sirujuk-data'
import { NAVY } from '../../lib/sirujuk-data'
import { useReferrals } from '../../hooks/useReferral'

export const Dashboard = ({ go, onSelect }: { go: (v: View) => void; onSelect: (c: RujukanCase) => void }) => {
  const { data: referrals = [], isError } = useReferrals()
  const tinggi = referrals.filter(c => c.risk === 'tinggi' && c.status !== 'selesai')
  return (
    <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-6">
      <PageHead eyebrow="Ringkasan hari ini" title="Hai, Adit!" sub="Ini yang perlu kamu cek dulu buat periode Agustus 2024." />
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Ringkasan belum bisa dimuat. Coba lagi sebentar.</p>}

      <div className="rounded-4xl p-6 flex items-center gap-6 text-white" style={{ backgroundColor: NAVY }}>
        <div className="w-28 h-24 shrink-0 hidden sm:block"><IllustrationDecision /></div>
        <div className="flex-1">
          <div className="text-xs font-bold tracking-widest uppercase text-white/50">Yang perlu dicek dulu</div>
          <div className="text-xl font-extrabold mt-1">{tinggi.length} rujukan berisiko tinggi masih menunggu kamu</div>
          <p className="text-sm text-white/70 mt-1">Cek yang ini dulu, baru lanjut ke rujukan lainnya.</p>
        </div>
        <button type="button" onClick={() => go('queue')} className="shrink-0 inline-flex items-center gap-2 bg-white font-semibold px-5 py-3 rounded-4xl transition-transform hover:scale-[1.02]" style={{ color: NAVY }}>
          Lihat antrean <ArrowRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Rujukan masuk', val: '1.284', sub: 'bulan ini', Icon: Inbox },
          { label: 'Perlu dicek', val: '186', sub: '14,5% dari total', Icon: TriangleAlert },
          { label: 'Masih mengantre', val: '44', sub: 'tinggal ditindaklanjuti', Icon: ListChecks },
          { label: 'Sudah beres', val: '142', sub: '76,3% dari yang ditandai', Icon: Check },
        ].map(({ label, val, sub, Icon }) => (
          <div key={label} className="bg-white rounded-4xl border border-[#DCE3EC] p-5">
            <div className="flex items-center gap-2 text-[#8A98AC]">
              <Icon size={15} />
              <span className="text-xs font-semibold text-[#56657A]">{label}</span>
            </div>
            <div className="font-mono text-3xl font-bold mt-3 text-[#0E1B2A]">{val}</div>
            <div className="text-xs text-[#8A98AC] mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
          <div className="font-bold text-[#0E1B2A]">Mulai dari sini</div>
          <button type="button" onClick={() => go('queue')} className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY }}>Lihat semua <ChevronRight aria-hidden="true" size={14} /></button>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {tinggi.map(c => (
            <button type="button" key={c.id} onClick={() => onSelect(c)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">{c.pasien}</div>
                <div className="text-xs text-[#56657A] truncate">{c.diagnosa}</div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
              <ChevronRight size={16} className="text-[#8A98AC]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Rujukan Masuk
