import { useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'
import type { SessionState } from '../../types/session'

type PresenceStripProps = {
  socket: Socket
  roomState: RoomState
  session: SessionState
  isDm: boolean
  playerSessionId: string | null | undefined
  compact?: boolean
}

export function PresenceStrip({
  socket,
  roomState,
  session,
  isDm,
  playerSessionId,
  compact = false,
}: PresenceStripProps) {
  const rows = useMemo(() => {
    return roomState.tokens
      .filter((t) => t.type === 'pc' && t.claimedBy)
      .map((t) => ({
        name: t.name,
        sessionId: t.claimedBy as string,
        raised: (roomState.raisedHands ?? []).includes(t.claimedBy as string),
      }))
  }, [roomState.tokens, roomState.raisedHands])

  const mineRaised =
    Boolean(playerSessionId) && (roomState.raisedHands ?? []).includes(playerSessionId as string)

  const canToggleOwn =
    session.role === 'player' && session.claimedTokenId !== null && Boolean(playerSessionId)

  const showStrip = rows.length > 0 || canToggleOwn

  const toggleMine = () => {
    if (!playerSessionId || !canToggleOwn) return
    socket.emit('raiseHand', { raised: !mineRaised })
  }

  if (!showStrip) return null

  return (
    <div
      className={
        compact
          ? 'mb-2 w-full rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)]/95 px-2 py-1.5'
          : 'mb-3 w-full rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)]/60 px-3 py-2'
      }
      aria-label="Presencia en mesa"
    >
      <p className="font-vtt-display text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[var(--vtt-text-muted)]">
        Presencia
      </p>
      {rows.length > 0 ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {rows.map((r) => (
            <li
              key={r.sessionId}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-1.5 py-0.5 text-[0.72rem] text-[var(--vtt-text)]"
            >
              <span className="min-w-0 truncate">{r.name}</span>
              {r.raised ? (
                <span className="shrink-0 text-[0.85rem]" title="Mano levantada" aria-hidden>
                  ✋
                </span>
              ) : null}
              {isDm && r.raised ? (
                <button
                  type="button"
                  className="shrink-0 rounded px-1 text-[0.65rem] leading-none text-[var(--vtt-text-muted)] hover:bg-[var(--vtt-border-subtle)] hover:text-[var(--vtt-text)]"
                  title="Quitar mano levantada"
                  onClick={() =>
                    socket.emit('raiseHandDismiss', { playerSessionId: r.sessionId })
                  }
                >
                  ✕
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canToggleOwn ? (
        <button
          type="button"
          className={`mt-2 w-full rounded-[var(--vtt-radius-sm)] border px-2 py-1.5 font-vtt-display text-[0.65rem] font-semibold uppercase tracking-wide transition ${
            mineRaised
              ? 'border-[var(--vtt-gold)] bg-[var(--vtt-surface-warm)] text-[var(--vtt-gold)]'
              : 'border-[var(--vtt-border)] bg-[var(--vtt-bg)] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold-dim)]'
          }`}
          onClick={toggleMine}
        >
          {mineRaised ? 'Bajar la mano' : 'Levantar la mano'}
        </button>
      ) : null}
    </div>
  )
}
