import type { Token } from '../../types/room'
import { DmCollapsibleCard } from '../dm/DmCollapsibleCard'

type InitiativeState = {
  visible: boolean
  order: string[]
  currentIndex: number | null
  modifiers?: Record<string, number>
}

type InitiativePanelProps = {
  initiative: InitiativeState
  tokens: Token[]
  isDm: boolean
  onToggleVisibility: (visible: boolean) => void
  onMove: (tokenId: string, direction: 'up' | 'down') => void
  onSetCurrent: (tokenId: string) => void
  onNext: () => void
  /** DM: ordenar por tirada d20. */
  onRollAll?: () => void
  /** DM: modificador numérico a la tirada de iniciativa (se suma al d20). */
  onSetModifier?: (tokenId: string, modifier: number) => void
  /**
   * `floating`: barra inferior (jugadores / espectadores).
   * `dmHud`: columna derecha del director (minimizable con persistencia).
   */
  placement?: 'floating' | 'dmHud'
  roomId?: string
}

export function InitiativePanel({
  initiative,
  tokens,
  isDm,
  onToggleVisibility,
  onMove,
  onSetCurrent,
  onNext,
  onRollAll,
  onSetModifier,
  placement = 'floating',
  roomId,
}: InitiativePanelProps) {
  const dockOffsetStyle = {
    bottom: 'max(4.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))',
  } as const
  const tokenMap = new Map(tokens.map((t) => [t.id, t]))
  const mods = initiative.modifiers ?? {}
  const rows = initiative.order
    .map((tokenId) => tokenMap.get(tokenId))
    .filter((token): token is Token => Boolean(token))

  const isHud = placement === 'dmHud' && isDm && Boolean(roomId)

  if (!initiative.visible && !isDm) return null

  if (!initiative.visible && isDm) {
    const inner = (
      <div className="vtt-surface vtt-glow-border rounded-[var(--vtt-radius)] px-3 py-2">
        <button
          type="button"
          className="vtt-btn-primary w-full text-xs"
          onClick={() => onToggleVisibility(true)}
        >
          Mostrar iniciativa
        </button>
      </div>
    )
    if (!isHud) return null
    return (
      <DmCollapsibleCard
        roomId={roomId!}
        sectionId="initiative"
        title="Iniciativa"
        className="w-full"
      >
        {inner}
      </DmCollapsibleCard>
    )
  }

  const panelInner = (
    <div
      className={
        isHud
          ? 'min-w-0 px-1 py-0.5'
          : 'vtt-surface vtt-glow-border w-full max-w-4xl rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 p-3 backdrop-blur-sm'
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        {isHud ? null : (
          <h3 className="font-vtt-display text-sm tracking-wide text-[var(--vtt-gold)]">
            Iniciativa
          </h3>
        )}
        <div
          className={`flex flex-wrap items-center gap-2 ${isHud ? 'ml-auto w-full justify-end sm:w-auto' : ''}`}
        >
          {isDm ? (
            <>
              {onRollAll ? (
                <button
                  type="button"
                  className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-2 py-1 text-xs text-[var(--vtt-text)] hover:border-[var(--vtt-gold)]"
                  onClick={onRollAll}
                >
                  Tirar orden (d20)
                </button>
              ) : null}
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
            const mod = mods[token.id] ?? 0
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
                  {mod !== 0 ? (
                    <span className="ml-1 font-mono text-[0.7rem] text-[var(--vtt-forest)]">
                      ({mod > 0 ? '+' : ''}
                      {mod})
                    </span>
                  ) : null}
                  {isCurrent ? ' (turno actual)' : ''}
                </button>
                {isDm && onSetModifier ? (
                  <label className="flex shrink-0 items-center gap-0.5 text-[var(--vtt-text-muted)]">
                    <span className="sr-only">Mod iniciativa para {token.name}</span>
                    <input
                      type="number"
                      className="w-11 rounded border border-[var(--vtt-border)] bg-[var(--vtt-bg)] px-1 py-0.5 text-[0.7rem] text-[var(--vtt-text)]"
                      value={mod}
                      min={-99}
                      max={99}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '' || raw === '-') return
                        const n = Number.parseInt(raw, 10)
                        if (Number.isFinite(n)) onSetModifier(token.id, n)
                      }}
                      aria-label={`Modificador de iniciativa para ${token.name}`}
                    />
                  </label>
                ) : null}
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
  )

  if (isHud) {
    return (
      <DmCollapsibleCard
        roomId={roomId!}
        sectionId="initiative"
        title="Iniciativa"
        className="w-full"
      >
        {panelInner}
      </DmCollapsibleCard>
    )
  }

  return (
    <section className="fixed inset-x-0 z-[88] flex justify-center px-3" style={dockOffsetStyle}>
      {panelInner}
    </section>
  )
}
