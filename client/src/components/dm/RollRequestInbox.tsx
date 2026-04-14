import type { Socket } from 'socket.io-client'
import type { PendingRollRequest } from '../../types/room'

function modeShort(mode: PendingRollRequest['mode']): string {
  if (mode === 'advantage') return 'ventaja'
  if (mode === 'disadvantage') return 'desventaja'
  return 'normal'
}

type RollRequestInboxProps = {
  socket: Socket
  requests: PendingRollRequest[]
  /** Dentro de `DmCollapsibleCard`: sin caja ni título propios. */
  embedded?: boolean
}

export function RollRequestInbox({ socket, requests, embedded = false }: RollRequestInboxProps) {
  if (requests.length === 0) return null

  const list = (
    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
      {requests.map((r) => (
        <li
          key={r.id}
          className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] p-2 text-xs text-[var(--vtt-text)]"
        >
          <p className="font-semibold text-[var(--vtt-gold)]">{r.fromLabel}</p>
          <p className="mt-1 whitespace-pre-wrap text-[var(--vtt-text)]">{r.reason}</p>
          <p className="mt-1 font-mono text-[0.7rem] text-[var(--vtt-text-muted)]">
            {r.dieType}
            {r.dieType === 'd20' && r.mode !== 'normal' ? ` · ${modeShort(r.mode)}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="vtt-btn-primary text-[0.65rem] px-2 py-1"
              onClick={() =>
                socket.emit('rollRequestResolve', { requestId: r.id, action: 'approve' })
              }
            >
              Aprobar
            </button>
            <button
              type="button"
              className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold-dim)] hover:text-[var(--vtt-text)]"
              onClick={() =>
                socket.emit('rollRequestResolve', { requestId: r.id, action: 'dismiss' })
              }
            >
              Ignorar
            </button>
          </div>
        </li>
      ))}
    </ul>
  )

  if (embedded) {
    return (
      <div className="min-w-0 space-y-2 px-1 py-0.5" aria-label="Solicitudes de tirada">
        {list}
      </div>
    )
  }

  return (
    <section
      className="vtt-surface vtt-glow-border shrink-0 space-y-2 rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 p-3 shadow-lg backdrop-blur-sm"
      aria-label="Solicitudes de tirada"
    >
      <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--vtt-gold)]">
        Solicitudes de tirada
      </p>
      {list}
    </section>
  )
}
