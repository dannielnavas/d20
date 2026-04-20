import { useCallback, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { Token } from '../../types/room'

type Props = {
  tokens: Token[]
  socket: Socket
  getSpawnCenter: () => { x: number; y: number }
}

export function DmQuickNpcPanel({ tokens, socket, getSpawnCenter }: Props) {
  const [open, setOpen] = useState(false)

  const npcs = useMemo(
    () => tokens.filter((t) => t.type === 'npc').sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [tokens],
  )

  const onMap = npcs.filter((t) => t.onMap !== false)
  const inReserve = npcs.filter((t) => t.onMap === false)

  const activate = useCallback(
    (tokenId: string) => {
      const { x, y } = getSpawnCenter()
      socket.emit('npcSetOnMap', { tokenId, onMap: true, x, y })
    },
    [getSpawnCenter, socket],
  )

  const bench = useCallback(
    (tokenId: string) => {
      socket.emit('npcSetOnMap', { tokenId, onMap: false })
    },
    [socket],
  )

  if (npcs.length === 0) return null

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[1999]">
      {/* Botón flotante de apertura */}
      <button
        type="button"
        title="Panel rápido de PNJ"
        aria-expanded={open}
        aria-controls="dm-quick-npc-panel"
        className={`flex items-center gap-1.5 rounded-[var(--vtt-radius-sm)] border px-2.5 py-1.5 font-vtt-display text-[0.7rem] font-semibold uppercase tracking-wide shadow-md backdrop-blur-sm transition ${
          open
            ? 'border-[var(--vtt-ember)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-ember)]'
            : 'border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/90 text-[var(--vtt-gold)] hover:border-[var(--vtt-gold-dim)]'
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>🧌</span>
        PNJ
        <span className="ml-0.5 rounded-sm bg-[var(--vtt-ember)]/20 px-1 text-[0.6rem] text-[var(--vtt-ember)]">
          {npcs.length}
        </span>
        <span className="ml-0.5 text-[0.75rem]">{open ? '▲' : '▼'}</span>
      </button>

      {/* Panel desplegable */}
      {open ? (
        <div
          id="dm-quick-npc-panel"
          className="mt-1.5 w-[min(18rem,calc(100vw-4rem))] rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/97 p-3 shadow-xl backdrop-blur-md"
          role="region"
          aria-label="Panel rápido de PNJ"
        >
          {/* En mapa */}
          {onMap.length > 0 ? (
            <section className="mb-3">
              <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
                En mapa ({onMap.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {onMap.map((t) => (
                  <NpcRow key={t.id} token={t} action="bench" onAction={() => bench(t.id)} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* En reserva */}
          {inReserve.length > 0 ? (
            <section className={onMap.length > 0 ? 'border-t border-[var(--vtt-border-subtle)] pt-3' : ''}>
              <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
                Reserva ({inReserve.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {inReserve.map((t) => (
                  <NpcRow key={t.id} token={t} action="activate" onAction={() => activate(t.id)} />
                ))}
              </ul>
            </section>
          ) : null}

          {npcs.length === 0 ? (
            <p className="text-xs text-[var(--vtt-text-muted)]">
              Sin PNJ creados aún. Ve a la pestaña "Elenco".
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

type RowProps = {
  token: Token
  action: 'activate' | 'bench'
  onAction: () => void
}

function NpcRow({ token: t, action, onAction }: RowProps) {
  return (
    <li className="flex items-center gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-2 py-1.5">
      {/* Avatar */}
      <div
        className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)]"
        aria-hidden
      >
        {t.img ? (
          <img src={t.img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-vtt-display text-[0.6rem] text-[var(--vtt-gold)]">
            {t.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Nombre */}
      <span className="min-w-0 flex-1 truncate font-vtt-display text-xs text-[var(--vtt-text)]">
        {t.name}
      </span>

      {/* Acción */}
      {action === 'activate' ? (
        <button
          type="button"
          title="Sacar al mapa"
          className="shrink-0 rounded border border-[var(--vtt-forest)]/50 bg-[var(--vtt-forest)]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--vtt-forest)] transition hover:bg-[var(--vtt-forest)]/30"
          onClick={onAction}
        >
          + Mapa
        </button>
      ) : (
        <button
          type="button"
          title="Enviar a reserva"
          className="shrink-0 rounded border border-[var(--vtt-ember)]/40 bg-[var(--vtt-ember)]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--vtt-ember)] transition hover:bg-[var(--vtt-ember)]/25"
          onClick={onAction}
        >
          − Mapa
        </button>
      )}
    </li>
  )
}
