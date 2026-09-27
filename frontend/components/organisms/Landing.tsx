'use client'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { PrimaryButton } from '../atoms/PrimaryButton'
import { IllustrationAudit, IllustrationDecision, IllustrationHero, IllustrationTransparent } from '../atoms/Illustrations'
import { NAVY } from '../../lib/sirujuk-data'

export const Landing = ({ onEnter }: { onEnter: () => void }) => (
  <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
    <header className="flex items-center justify-between px-6 md:px-12 py-5 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-4xl flex items-center justify-center text-white font-extrabold" style={{ backgroundColor: NAVY }}>S</div>
        <div>
          <div className="font-extrabold text-[#0E1B2A] leading-none tracking-tight">SIRUJUK</div>
          <div className="text-[11px] text-[#8A98AC] mt-0.5">Teman cek rujukan</div>
        </div>
      </div>
      <PrimaryButton onClick={onEnter} className="text-sm px-4 py-2">Masuk</PrimaryButton>
    </header>

    <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 md:px-12">
      <section className="grid lg:grid-cols-2 gap-10 items-center pt-8 pb-16">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-4xl text-xs font-bold" style={{ backgroundColor: '#E5EDF6', color: NAVY }}>
            <ShieldCheck size={14} /> Teman cek rujukan BPJS Kesehatan
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0E1B2A] leading-[1.08] tracking-tight mt-5">
            Cek rujukan jadi lebih cepat, kamu pun lebih tenang.
          </h1>
          <p className="text-[#56657A] text-lg mt-5 leading-relaxed max-w-lg">
            SIRUJUK bantu kamu menemukan rujukan yang perlu dicek duluan, menjelaskan alasannya dengan bahasa yang gampang, dan menemani setiap keputusan. Kamu tetap pegang kendali.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <PrimaryButton onClick={onEnter} className="px-5 py-3">
              Mulai cek <ArrowRight size={18} />
            </PrimaryButton>
            <div className="text-sm text-[#56657A]">
              Ada <span className="font-bold text-[#0E1B2A]">186</span> rujukan yang siap kamu cek bulan ini
            </div>
          </div>
        </div>
        <div className="h-[340px] md:h-[420px]"><IllustrationHero /></div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 pb-16">
        {[
          { Ill: IllustrationDecision, title: 'Langsung tahu mulai dari mana', body: 'Yang paling perlu perhatian selalu kami taruh di paling atas.' },
          { Ill: IllustrationTransparent, title: 'Alasannya gampang dipahami', body: 'Setiap rujukan punya penjelasan, jadi kamu nggak cuma lihat angka.' },
          { Ill: IllustrationAudit, title: 'Kamu tetap yang menentukan', body: 'Ada checklist dan catatan buat bantu audit. Kami bantu, kamu yang putuskan.' },
        ].map(({ Ill, title, body }) => (
          <div key={title} className="bg-white rounded-4xl border border-[#DCE3EC] p-6">
            <div className="h-32 mb-4"><Ill /></div>
            <h3 className="font-bold text-[#0E1B2A]">{title}</h3>
            <p className="text-sm text-[#56657A] mt-1.5 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-4xl p-8 md:p-10 mb-16 grid grid-cols-2 md:grid-cols-4 gap-6" style={{ backgroundColor: NAVY }}>
        {[
          { v: '1.284', l: 'Rujukan bulan ini' },
          { v: '186', l: 'Perlu kamu cek' },
          { v: '76%', l: 'Sudah beres dicek' },
          { v: '38', l: 'Berhasil dicegah' },
        ].map(s => (
          <div key={s.l}>
            <div className="font-mono text-3xl font-bold text-white">{s.v}</div>
            <div className="text-sm text-white/70 mt-1">{s.l}</div>
          </div>
        ))}
      </section>
    </main>

    <footer className="border-t border-[#DCE3EC] py-6 text-center text-xs text-[#8A98AC] px-6">
      SIRUJUK, teman cek rujukan kesehatan. Kami bantu urutkan, keputusan tetap di tangan kamu.
    </footer>
  </div>
)

// Shell: Sidebar + Topbar
