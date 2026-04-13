import type { Token } from '../../types/room'

type InitiativeState = {
  visible: boolean
  order: string[]
  currentIndex: number | null
}

type InitiativePanelProps = {
  initiative: InitiativeState
  tokens: Token[]
  isDm: boolean
  onToggleVisibility: (visible: boolean) => void
  onMove: (tokenId: string, direction: 'up' | 'down') => void
  onSetCurrent: (tokenId: string) => void
  onNext: () => void
}

export function InitiativePanel({
  initiative,
  tokens,
  isDm,
  onToggleVisibility,
  onMove,
  onSetCurrent,
  onNext,
}: InitiativePanelProps) {
  const dockOffsetStyle = {
    bottom: 'max(4.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))',
  } as const
  const tokenMap = new Map(tokens.map((t) => [t.id, t]))
  const rows = initiative.order
    .map((tokenId) => tokenMap.get(tokenId))
    .filter((token): token is Token => Boolean(token))

  if (!initiative.visible && !isDm) return null

  if (!initiative.visible && isDm) {
    return (
      <section
        className="fixed inset-x-0 z-[88] flex justify-center px-3"
        style={dockOffsetStyle}
      >
        <div className="vtt-surface vtt-glow-border rounded-[var(--vtt-radius)] px-3 py-2">
          <button
            type="button"
            className="vtt-btn-primary text-xs"
            onClick={() => onToggleVisibility(true)}
          >
            Mostrar iniciativa
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="fixed inset-x-0 z-[88] flex justify-center px-3"
      style={dockOffsetStyle}
    >
      <div className="vtt-surface vtt-glow-border w-full max-w-4xl rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 p-3 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-vtt-display text-sm tracking-wide text-[var(--vtt-gold)]">Iniciativa</h3>
          <div className="flex items-center gap-2">
            {isDm ? (
              <>
                <button type="button" className="vtt-btn-primary text-xs" onClick={onNext}>
                  Siguiente turno
                </button>
                <button
                  type="button"
                  className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-2 py-1 text-xs text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)]"
                  onClick={() => onToggleVisibility(false)}
                >
                  Ocultar
                </button>
              </>
            ) : null}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-[var(--vtt-text-muted)]">Sin personajes en iniciativa.</p>
        ) : (
          <ol className="grid max-h-44 gap-1 overflow-auto pr-1">
            {rows.map((token, index) => {
              const isCurrent = initiative.currentIndex === index
              return (
                <li
                  key={token.id}
                  className={`flex items-center justify-between gap-2 rounded-[var(--vtt-radius-sm)] border px-2 py-1 text-xs ${
                    isCurrent
                      ? 'border-[var(--vtt-gold)] bg-[var(--vtt-surface-warm)] text-[var(--vtt-text)]'
                      : 'border-[var(--vtt-border-subtle)] text-[var(--vtt-text-muted)]'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => isDm && onSetCurrent(token.id)}
                    disabled={!isDm}
                  >
                    <span className="mr-2 font-mono text-[0.72rem] text-[var(--vtt-gold-dim)]">
                      {index + 1}.
                    </span>
                    {token.name}
                    {isCurrent ? ' (turno actual)' : ''}
                  </button>
                  {isDm ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded border border-[var(--vtt-border)] px-1.5 py-0.5 hover:border-[var(--vtt-gold)]"
                        onClick={() => onMove(token.id, 'up')}
                        disabled={index === 0}
                        aria-label={`Subir ${token.name}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[var(--vtt-border)] px-1.5 py-0.5 hover:border-[var(--vtt-gold)]"
                        onClick={() => onMove(token.id, 'down')}
                        disabled={index === rows.length - 1}
                        aria-label={`Bajar ${token.name}`}
                      >
                        ↓
                      </button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
