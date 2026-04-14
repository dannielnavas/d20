import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'
import type { SessionState } from '../../types/session'
import { PollStartModal } from './PollStartModal'

function formatRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m <= 0) return `${r}s`
  return `${m}:${r.toString().padStart(2, '0')}`
}

export type GroupPollPanelProps = {
  socket: Socket
  roomState: RoomState
  isDm: boolean
  session: SessionState | null
  /**
   * El DM puede abrir «Nueva votación» desde la columna derecha (DmHudColumn);
   * en ese caso no se muestra el botón flotante inferior.
   */
  suppressDmStarter?: boolean
}

export function GroupPollPanel({
  socket,
  roomState,
  isDm,
  session,
  suppressDmStarter = false,
}: GroupPollPanelProps) {
  const poll = roomState.activePoll

  if (!poll && !isDm) return null
  const [modalOpen, setModalOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!poll?.endsAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [poll?.endsAt])

  const remainingMs =
    poll?.endsAt !== null && poll?.endsAt !== undefined ? Math.max(0, poll.endsAt - now) : null

  const maxCount = poll ? Math.max(1, ...poll.counts) : 1
  const totalVotes = poll ? poll.counts.reduce((a, b) => a + b, 0) : 0

  const canVote =
    session?.role === 'player' &&
    session.claimedTokenId !== null &&
    poll &&
    poll.myVote === undefined

  const vote = (optionIndex: number) => {
    socket.emit('pollVote', { optionIndex })
  }

  return (
    <div className="pointer-events-auto fixed bottom-28 left-1/2 z-[91] w-[min(28rem,calc(100vw-1.5rem))] max-h-[min(70svh,calc(100vh-8rem))] -translate-x-1/2 overflow-y-auto px-1">
      {isDm && !poll && !suppressDmStarter ? (
        <button
          type="button"
          className="w-full rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] px-3 py-2 text-left font-vtt-display text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] hover:border-[var(--vtt-gold-dim)]"
          onClick={() => setModalOpen(true)}
        >
          Nueva votación grupal
        </button>
      ) : null}

      {poll ? (
        <div className="vtt-surface vtt-glow-border mt-2 space-y-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-vtt-display text-sm font-semibold leading-snug text-[var(--vtt-text)]">
              {poll.question}
            </p>
            {remainingMs !== null ? (
              <span
                className="shrink-0 rounded border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] px-2 py-0.5 font-mono text-[0.65rem] text-[var(--vtt-gold)]"
                title="Tiempo restante"
              >
                {remainingMs > 0 ? formatRemaining(remainingMs) : '0s'}
              </span>
            ) : null}
          </div>

          <ul className="space-y-2">
            {poll.options.map((label, i) => {
              const c = poll.counts[i] ?? 0
              const pct = maxCount > 0 ? Math.round((c / maxCount) * 100) : 0
              const isMine = poll.myVote === i
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 font-medium text-[var(--vtt-text)]">
                      {label}
                    </span>
                    <span className="shrink-0 font-mono text-[var(--vtt-text-muted)]">{c}</span>
                  </div>
                  <div
                    className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--vtt-bg)] ring-1 ring-[var(--vtt-border-subtle)]"
                    aria-hidden
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        isMine ? 'bg-[var(--vtt-gold)]' : 'bg-[var(--vtt-gold-dim)]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )
              return (
                <li key={`${poll.id}-opt-${i}`}>
                  {canVote ? (
                    <button
                      type="button"
                      className="w-full rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] p-2 text-left hover:border-[var(--vtt-gold)]"
                      onClick={() => vote(i)}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="rounded-[var(--vtt-radius-sm)] p-2">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="text-[0.65rem] text-[var(--vtt-text-muted)]">
            {totalVotes} voto{totalVotes === 1 ? '' : 's'}
            {isDm && poll.votes ? (
              <span className="ml-1 font-mono">
                · {Object.keys(poll.votes).length} participante(s)
              </span>
            ) : null}
          </p>

          {isDm ? (
            <button
              type="button"
              className="vtt-btn-secondary w-full text-xs"
              onClick={() => socket.emit('pollEnd')}
            >
              Cerrar votación
            </button>
          ) : null}
        </div>
      ) : null}

      <PollStartModal open={modalOpen} onClose={() => setModalOpen(false)} socket={socket} />
    </div>
  )
}
