import type { ReactNode } from 'react'

export const IllustrationHero = () => (
  <svg aria-hidden="true" viewBox="0 0 560 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="280" cy="392" rx="230" ry="22" fill="#DCE3EC" />
    <rect x="96" y="70" width="272" height="292" rx="20" fill="#E7ECF3" />
    <rect x="120" y="98" width="224" height="240" rx="14" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    <rect x="140" y="120" width="120" height="12" rx="6" fill="#1E3A5F" />
    <rect x="140" y="142" width="184" height="8" rx="4" fill="#DCE3EC" />
    {[172, 206, 240, 274].map((y, i) => (
      <g key={y}>
        <rect x="140" y={y} width="184" height="26" rx="8" fill="#F4F6F9" />
        <circle cx="154" cy={y + 13} r="5" fill={['#D42828', '#C77A0A', '#1C8C4A', '#1C8C4A'][i]} />
        <rect x="168" y={y + 9} width="96" height="8" rx="4" fill="#C4CFDC" />
      </g>
    ))}
    <circle cx="316" cy="185" r="34" fill="#1E3A5F" />
    <circle cx="316" cy="185" r="22" fill="#FFFFFF" />
    <path d="M316 174v22M305 185h22" stroke="#D42828" strokeWidth="4" strokeLinecap="round" />
    <rect x="336" y="205" width="34" height="12" rx="6" transform="rotate(45 336 205)" fill="#16304F" />
    <circle cx="430" cy="188" r="30" fill="#C77A0A" />
    <path d="M400 344c0-33 13-60 30-60s30 27 30 60z" fill="#1E3A5F" />
    <rect x="416" y="238" width="28" height="50" rx="12" fill="#1E3A5F" />
    <circle cx="150" cy="86" r="20" fill="#1C8C4A" />
    <path d="M141 86l6 7 12-14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IllustrationDecision = () => (
  <svg aria-hidden="true" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="150" cy="222" rx="120" ry="14" fill="#E7ECF3" />
    <path d="M150 40l90 52v104l-90 24-90-24V92z" fill="#E7ECF3" />
    <path d="M150 40l90 52-90 24-90-24z" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    <path d="M60 92l90 24v104l-90-24z" fill="#F4F6F9" />
    <path d="M240 92l-90 24v104l90-24z" fill="#EEF2F7" />
    <circle cx="150" cy="150" r="30" fill="#1E3A5F" />
    <path d="M150 138v24M138 150h24" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
  </svg>
)

export const IllustrationTransparent = () => (
  <svg aria-hidden="true" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="150" cy="222" rx="120" ry="14" fill="#E7ECF3" />
    <rect x="70" y="60" width="160" height="150" rx="14" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    <rect x="90" y="86" width="70" height="10" rx="5" fill="#1E3A5F" />
    {[112, 138, 164].map((y, i) => (
      <g key={y}>
        <rect x="90" y={y} width="120" height="14" rx="7" fill="#F4F6F9" />
        <rect x="90" y={y} width={[96, 70, 44][i]} height="14" rx="7" fill={['#D42828', '#C77A0A', '#1C8C4A'][i]} />
      </g>
    ))}
    <circle cx="228" cy="66" r="26" fill="#C77A0A" />
    <path d="M228 54v12M228 78h.01" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export const IllustrationAudit = () => (
  <svg aria-hidden="true" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="150" cy="222" rx="120" ry="14" fill="#E7ECF3" />
    <rect x="78" y="46" width="144" height="168" rx="14" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    {[76, 106, 136, 166].map((y, i) => (
      <g key={y}>
        <rect x="98" y={y} width="18" height="18" rx="5" fill={i < 3 ? '#1C8C4A' : '#E7ECF3'} />
        {i < 3 && <path d={`M102 ${y + 9}l4 4 7-8`} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        <rect x="126" y={y + 4} width="76" height="10" rx="5" fill="#DCE3EC" />
      </g>
    ))}
    <circle cx="214" cy="52" r="26" fill="#1E3A5F" />
    <path d="M204 52l6 7 14-14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IllustrationDone = () => (
  <svg aria-hidden="true" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="120" cy="164" rx="96" ry="12" fill="#E7ECF3" />
    <rect x="66" y="44" width="108" height="108" rx="14" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    <circle cx="120" cy="90" r="26" fill="#E4F4EA" />
    <path d="M108 90l8 9 16-18" stroke="#1C8C4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="92" y="126" width="56" height="8" rx="4" fill="#DCE3EC" />
  </svg>
)

export const IllustrationQueue = () => (
  <svg aria-hidden="true" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="150" cy="220" rx="128" ry="14" fill="#E7ECF3" />
    {[
      { y: 58, w: 176, dot: '#D42828' },
      { y: 100, w: 158, dot: '#C77A0A' },
      { y: 142, w: 140, dot: '#1C8C4A' },
    ].map(({ y, w, dot }) => (
      <g key={y}>
        <rect x={150 - w / 2} y={y} width={w} height="34" rx="10" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
        <circle cx={150 - w / 2 + 20} cy={y + 17} r="6" fill={dot} />
        <rect x={150 - w / 2 + 36} y={y + 13} width={w - 88} height="8" rx="4" fill="#E7ECF3" />
        <rect x={150 + w / 2 - 40} y={y + 10} width="28" height="14" rx="7" fill="#1E3A5F" />
      </g>
    ))}
    <circle cx="238" cy="66" r="26" fill="#1E3A5F" />
    <path d="M231 66l5 6 11-12" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IllustrationEmpty = () => (
  <svg aria-hidden="true" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="120" cy="162" rx="92" ry="12" fill="#E7ECF3" />
    <rect x="60" y="40" width="120" height="104" rx="14" fill="#FFFFFF" stroke="#DCE3EC" strokeWidth="2" />
    <rect x="82" y="64" width="76" height="8" rx="4" fill="#E7ECF3" />
    <rect x="82" y="86" width="56" height="8" rx="4" fill="#E7ECF3" />
    <circle cx="168" cy="120" r="30" fill="#F4F6F9" stroke="#DCE3EC" strokeWidth="2" />
    <path d="M160 112l16 16M176 112l-16 16" stroke="#8A98AC" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

// Shared components

// Landing Page
