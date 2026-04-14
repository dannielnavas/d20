import type { Socket } from 'socket.io-client'
import { TOKEN_QUICK_REACTIONS } from '../../config/tokenReactions'

export type ScreenReactionPaletteProps = {
  socket: Socket
  /** Estilo del contenedor (p. ej. barra flotante o dentro del HUD). */
  className?: string
}

/**
 * Seis reacciones a pantalla completa (`screenReaction`). DM y jugadores (no espectadores).
 */
export function ScreenReactionPalette({ socket, className = '' }: ScreenReactionPaletteProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${className}`}
      role="toolbar"
      aria-label="Reacciones en pantalla para toda la mesa"
    >
      {TOKEN_QUICK_REACTIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          title={r.label}
          className={`vtt-sr-palette-btn vtt-sr-palette-btn--${r.id} flex size-9 items-center justify-center rounded-md border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] text-lg leading-none hover:border-[var(--vtt-gold-dim)] hover:bg-[var(--vtt-bg)]`}
          onClick={() => socket.emit('screenReaction', { reactionId: r.id })}
        >
          <span className="sr-only">{r.label}</span>
          <span aria-hidden>{r.emoji}</span>
        </button>
      ))}
    </div>
  )
}
