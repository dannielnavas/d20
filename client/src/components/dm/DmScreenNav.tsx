export type DmScreenId = 'mesa' | 'mapa' | 'elenco'

type DmScreenNavProps = {
  value: DmScreenId
  onChange: (id: DmScreenId) => void
}

const screens: { id: DmScreenId; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    id: 'mesa',
    label: 'Mesa',
    hint: 'Tablero en vivo',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1.5 6h13M6 6v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'mapa',
    label: 'Mapa',
    hint: 'Fondo y cuadrícula',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 12V4l3.5 1.5L10 4l4 1.5V12l-4-1.5-4.5 1.5L2 12z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M5.5 5.5v6M10 4v7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      </svg>
    ),
  },
  {
    id: 'elenco',
    label: 'Elenco',
    hint: 'Héroes y PNJ',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1 13.5C1 11 2.8 9 5 9M11 9c2.2 0 4 2 4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M7 9c.9.8 2 1.3 3 1.3M6 10.3C7 10.3 8 10 9 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },
]

import type React from 'react'

export function DmScreenNav({ value, onChange }: DmScreenNavProps) {
  return (
    <nav
      className="dm-screen-nav relative w-full overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface)]/80 p-1 shadow-[var(--dm-panel-shadow)] backdrop-blur-sm"
      aria-label="Secciones del Narrador"
    >
      <ul
        role="tablist"
        aria-orientation="horizontal"
        className="relative flex gap-1"
      >
        {screens.map((s) => {
          const active = value === s.id
          return (
            <li key={s.id} className="min-w-0 flex-1" role="presentation">
              <button
                type="button"
                role="tab"
                id={`dm-tab-${s.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(s.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                  e.preventDefault()
                  const i = screens.findIndex((x) => x.id === value)
                  const delta = e.key === 'ArrowRight' ? 1 : -1
                  const next = screens[(i + delta + screens.length) % screens.length]
                  onChange(next.id)
                }}
                className={`dm-nav-pill group flex w-full flex-col items-center gap-1 rounded-[calc(var(--vtt-radius-sm)+1px)] px-2 py-2.5 text-center transition-all duration-200 ${
                  active
                    ? 'bg-[#6366f1]/15 text-[#818cf8] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.3),0_0_16px_rgba(99,102,241,0.15)]'
                    : 'text-[var(--vtt-text-muted)] hover:bg-white/[0.04] hover:text-[var(--vtt-text)]'
                }`}
              >
                <span className={`transition-all duration-200 ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'}`}>
                  {s.icon}
                </span>
                <span className={`font-vtt-display text-[0.62rem] font-semibold uppercase tracking-[0.15em] transition-colors duration-200 ${active ? 'text-[#818cf8]' : ''}`}>
                  {s.label}
                </span>
                {active && (
                  <span className="mt-0.5 h-0.5 w-4 rounded-full bg-[#818cf8]/60" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
