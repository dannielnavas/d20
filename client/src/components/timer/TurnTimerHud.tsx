import { useId } from 'react'

/** Reloj de arena + cuenta atrás compartida (turnos con límite de tiempo). */

export type TurnTimerHudProps = {
  remaining: number
  totalSeconds: number
}

function formatMmSs(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/**
 * Reloj de arena SVG: arena superior ∝ tiempo restante; inferior ∝ tiempo transcurrido.
 */
export function TurnTimerHud({ remaining, totalSeconds }: TurnTimerHudProps) {
  const clipUid = useId().replace(/:/g, '')
  const upperId = `upperSandClip-${clipUid}`
  const lowerId = `lowerSandClip-${clipUid}`
  const ratio = totalSeconds > 0 ? Math.min(1, Math.max(0, remaining / totalSeconds)) : 0
  const urgent = remaining > 0 && remaining <= 10

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[95] flex -translate-x-1/2 flex-col items-center gap-2"
      style={{
        bottom: 'max(9rem, calc(env(safe-area-inset-bottom, 0px) + 8rem))',
      }}
      role="timer"
      aria-live="polite"
      aria-label={`Temporizador: ${formatMmSs(remaining)} restantes de ${formatMmSs(totalSeconds)}`}
    >
      <div
        className={`flex items-center gap-4 rounded-[var(--vtt-radius)] border border-[var(--vtt-gold-dim)] bg-[var(--vtt-bg-elevated)]/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-sm ${
          urgent ? 'ring-2 ring-[var(--vtt-ember)]/80' : ''
        }`}
      >
        <svg
          viewBox="0 0 100 120"
          className="h-20 w-16 shrink-0 text-[var(--vtt-gold)]"
          aria-hidden
        >
          <defs>
            <clipPath id={upperId}>
              <rect x="0" y={48 - 40 * ratio} width="100" height={40 * ratio} />
            </clipPath>
            <clipPath id={lowerId}>
              <rect x="0" y={112 - 60 * (1 - ratio)} width="100" height={60 * (1 - ratio)} />
            </clipPath>
          </defs>
          {/* Marco */}
          <path
            d="M 50 6 L 90 46 L 58 58 L 58 62 L 90 112 L 50 114 L 10 112 L 42 62 L 42 58 L 10 46 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            opacity={0.95}
          />
          {/* Arena superior (lo que queda por caer) */}
          <polygon
            points="50,8 88,46 12,46"
            fill="currentColor"
            opacity={0.45}
            clipPath={`url(#${upperId})`}
          />
          {/* Arena inferior (lo caído) */}
          <polygon
            points="12,114 88,114 50,64"
            fill="currentColor"
            opacity={0.55}
            clipPath={`url(#${lowerId})`}
          />
        </svg>
        <div className="min-w-[5.5rem] text-center">
          <p
            className={`font-vtt-display text-2xl font-bold tabular-nums tracking-tight ${
              urgent ? 'text-[var(--vtt-ember)]' : 'text-[var(--vtt-gold)]'
            }`}
          >
            {formatMmSs(remaining)}
          </p>
          <p className="mt-0.5 font-mono text-[0.65rem] text-[var(--vtt-text-muted)]">
            de {formatMmSs(totalSeconds)}
          </p>
        </div>
      </div>
    </div>
  )
}
