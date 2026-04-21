export type DmScreenId = 'mesa' | 'mapa' | 'elenco'

type DmScreenNavProps = {
  value: DmScreenId
  onChange: (id: DmScreenId) => void
}

const screens: { id: DmScreenId; label: string; hint: string }[] = [
  { id: 'mesa', label: 'Mesa', hint: 'Tablero en vivo' },
  { id: 'mapa', label: 'Mapa', hint: 'Fondo y cuadrícula' },
  { id: 'elenco', label: 'Elenco', hint: 'Héroes y PNJ' },
]

export function DmScreenNav({ value, onChange }: DmScreenNavProps) {
  return (
    <nav
      className="dm-screen-nav relative w-full overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface)] p-1 shadow-[var(--dm-panel-shadow)]"
      aria-label="Secciones del Narrador"
    >
      <div
        className="pointer-events-none absolute inset-y-2 left-2 w-px bg-gradient-to-b from-transparent via-[var(--vtt-gold-dim)] to-transparent opacity-40"
        aria-hidden
      />
      <ul
        role="tablist"
        aria-orientation="horizontal"
        className="relative flex flex-wrap gap-1 sm:gap-0"
      >
        {screens.map((s) => {
          const active = value === s.id
          return (
            <li key={s.id} className="min-w-0 flex-1 sm:flex-none sm:flex-1" role="presentation">
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
                className={`dm-nav-pill flex w-full flex-col items-center gap-0.5 rounded-[calc(var(--vtt-radius-sm)+2px)] px-3 py-2.5 text-center transition sm:py-3 ${
                  active
                    ? 'bg-[var(--vtt-surface-warm)] text-[var(--vtt-text)] shadow-[inset_0_0_0_1px_var(--vtt-border),0_8px_28px_var(--vtt-gold-glow)]'
                    : 'text-[var(--vtt-text-muted)] hover:bg-[var(--vtt-bg-elevated)] hover:text-[var(--vtt-text)]'
                }`}
              >
                <span className="font-vtt-display text-[0.72rem] font-semibold uppercase tracking-[0.2em]">
                  {s.label}
                </span>
                <span className="hidden text-[0.65rem] text-[var(--vtt-text-muted)] sm:block">
                  {s.hint}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
