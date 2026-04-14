import { useCallback, useId, useState } from 'react'
import type { Socket } from 'socket.io-client'

const PRESETS = [30, 60, 120, 300] as const

export type DmTurnTimerBarProps = {
  socket: Socket
  /** Si hay temporizador activo en el cliente (para mostrar Detener). */
  timerActive: boolean
  className?: string
  /** Dentro de `DmCollapsibleCard`: oculta el título duplicado. */
  embedded?: boolean
}

export function DmTurnTimerBar({
  socket,
  timerActive,
  className = '',
  embedded = false,
}: DmTurnTimerBarProps) {
  const baseId = useId()
  const inputId = `${baseId}-sec`
  const [seconds, setSeconds] = useState('60')

  const emitSet = useCallback(
    (sec: number) => {
      socket.emit('setTimer', { seconds: sec })
    },
    [socket],
  )

  const onStart = useCallback(() => {
    const n = Number.parseInt(seconds, 10)
    if (!Number.isFinite(n) || n < 1) return
    emitSet(n)
  }, [emitSet, seconds])

  const onStop = useCallback(() => {
    socket.emit('setTimer', { seconds: 0 })
  }, [socket])

  return (
    <div
      className={`vtt-surface vtt-glow-border flex flex-wrap items-end gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-3 py-2 ${className}`}
    >
      {embedded ? null : (
        <p className="w-full font-vtt-display text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--vtt-gold-dim)]">
          Temporizador de turno
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="rounded border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] px-2 py-1 font-mono text-[0.7rem] text-[var(--vtt-text)] hover:border-[var(--vtt-gold-dim)]"
            onClick={() => emitSet(p)}
          >
            {p}s
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <label htmlFor={inputId} className="sr-only">
          Segundos
        </label>
        <input
          id={inputId}
          type="number"
          min={1}
          max={7200}
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          className="vtt-input w-20 py-1.5 text-center font-mono text-xs"
        />
        <span className="text-[0.65rem] text-[var(--vtt-text-muted)]">s</span>
        <button type="button" className="vtt-btn-primary px-3 py-1.5 text-xs" onClick={onStart}>
          Iniciar
        </button>
        {timerActive ? (
          <button type="button" className="vtt-btn-secondary px-3 py-1.5 text-xs" onClick={onStop}>
            Detener
          </button>
        ) : null}
      </div>
    </div>
  )
}
