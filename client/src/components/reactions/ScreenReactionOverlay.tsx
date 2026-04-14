import { createPortal } from 'react-dom'
import { getQuickReaction } from '../../config/tokenReactions'
import type { ScreenReactionBurst } from '../../utils/screenReactionBurst'

export type ScreenReactionOverlayProps = {
  bursts: readonly ScreenReactionBurst[]
}

function screenFxHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById('vtt-screen-fx') ?? document.body
}

/**
 * Capa fija sobre toda la ventana: muestra ráfagas ya recibidas vía Socket.IO en `usePlayRoomSocket`.
 * Se monta en `#vtt-screen-fx` (sibling de `#root`) para evitar recortes y stacking raros dentro del mapa.
 */
export function ScreenReactionOverlay({ bursts }: ScreenReactionOverlayProps) {
  if (bursts.length === 0) return null

  const host = screenFxHost()
  if (!host) return null

  const layer = (
    <div className="vtt-screen-reaction-bursts-root pointer-events-none">
      {bursts.map((b) => {
        const def = getQuickReaction(b.reactionId)
        const emoji = def?.emoji ?? '✨'
        const sr = Math.min(5, Math.max(0, Math.floor(b.reactionId)))
        return (
          <div
            key={b.id}
            className="pointer-events-none absolute flex flex-col items-center gap-2"
            style={{
              left: `${b.xPct}%`,
              top: `${b.yPct}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="vtt-screen-reaction-burst flex flex-col items-center gap-2"
              data-sr={String(sr)}
            >
              <span
                className="select-none text-[min(38vw,16rem)] leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] drop-shadow-[0_8px_40px_rgba(0,0,0,0.95)]"
                aria-hidden
              >
                {emoji}
              </span>
              <span className="max-w-[92vw] truncate rounded-full bg-black/75 px-4 py-1.5 text-center font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)] shadow-lg ring-2 ring-black/50">
                {b.fromLabel}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  return createPortal(layer, host)
}
