import type { Token } from '../../types/room'

export type DmTokenRosterProps = {
  tokens: Token[]
  className?: string
}

export function DmTokenRoster({ tokens, className = '' }: DmTokenRosterProps) {
  const sorted = [...tokens].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'pc' ? -1 : 1
    return a.name.localeCompare(b.name, 'es')
  })

  return (
    <div
      className={`dm-setup-scroll flex max-h-[min(78svh,820px)] min-h-[12rem] flex-col gap-4 overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface)] p-5 shadow-[var(--dm-panel-shadow)] ${className}`}
    >
      <header>
        <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--vtt-gold-dim)]">
          En mesa
        </p>
        <h3 className="font-vtt-display mt-1 text-lg font-semibold text-[var(--vtt-text)]">
          Tokens activos
        </h3>
        <p className="mt-2 text-xs text-[var(--vtt-text-muted)]">
          {tokens.length === 0
            ? 'Aún no hay fichas. Crea PJs o PNJ con el formulario.'
            : `${tokens.length} ficha${tokens.length === 1 ? '' : 's'} en la sala.`}
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {sorted.map((t) => {
          const isPc = t.type === 'pc'
          const claimed = isPc && t.claimedBy !== null
          const status = !isPc ? 'DM' : claimed ? 'En juego' : 'Libre en lobby'

          return (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] px-3 py-2.5 transition hover:border-[var(--vtt-border)]"
            >
              <div
                className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)]"
                aria-hidden
              >
                {t.img ? (
                  <img src={t.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-vtt-display text-sm text-[var(--vtt-gold)]">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-vtt-display text-sm font-medium text-[var(--vtt-text)]">
                  {t.name}
                </p>
                <p className="mt-0.5 text-[0.7rem] text-[var(--vtt-text-muted)]">{status}</p>
              </div>
              <span
                className={`shrink-0 rounded-sm px-2 py-0.5 font-vtt-display text-[0.6rem] font-semibold uppercase tracking-wider ${
                  isPc
                    ? 'border border-[var(--vtt-forest)]/40 bg-[var(--vtt-forest)]/15 text-[var(--vtt-forest)]'
                    : 'border border-[var(--vtt-ember)]/35 bg-[var(--vtt-ember)]/12 text-[var(--vtt-ember)]'
                }`}
              >
                {isPc ? 'PJ' : 'PNJ'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
