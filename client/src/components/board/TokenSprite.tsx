import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { conditionAnimationClass, resolveConditionVisual } from '../../config/tokenConditions'
import { getQuickReaction } from '../../config/tokenReactions'
import type { Token } from '../../types/room'

export type TokenSpriteProps = {
  token: Token
  /** Nombre bajo el avatar (controlado por ajustes de sala). */
  showNameLabel: boolean
  isDragging: boolean
  isActiveTurn?: boolean
  isIdleCandidate?: boolean
  canDrag: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>, token: Token) => void
  onKeyDown?: (e: ReactKeyboardEvent<HTMLButtonElement>, token: Token) => void
  /** Reacción efímera mostrada encima del token (clave para reiniciar animación). */
  reactionBurst?: { reactionId: number; key: number } | null
  /** Solo DM: mano levantada del jugador que controla la ficha. */
  handRaised?: boolean
  /** Modo fantasma: preview semitransparente de un token que otro está arrastrando. */
  isGhost?: boolean
}

export function TokenSprite({
  token,
  showNameLabel,
  isDragging,
  isActiveTurn = false,
  isIdleCandidate = false,
  canDrag,
  onPointerDown,
  onKeyDown,
  reactionBurst = null,
  handRaised = false,
  isGhost = false,
}: TokenSpriteProps) {
  const half = token.size / 2

  const kind = token.type === 'pc' ? 'personaje' : 'PNJ'

  const columnClass = 'absolute flex flex-col items-center'

  const circleStyle = {
    width: token.size,
    height: token.size,
  }

  const conds = token.conditions?.filter(Boolean) ?? []
  const conditionsAria = conds.length > 0 ? ` Estados: ${conds.join(', ')}.` : ''
  const badgeSize = Math.max(14, Math.min(22, Math.round(token.size * 0.28)))
  const hpMax = token.hitPointsMax ?? 0
  const hpCurrent = Math.max(0, token.hitPointsCurrent ?? 0)
  const hpTemp = Math.max(0, token.hitPointsTemp ?? 0)
  const currentPct = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0
  const tempPct = hpMax > 0 ? Math.max(0, Math.min(100 - currentPct, (hpTemp / hpMax) * 100)) : 0
  const tokenBorderColor = token.frameColor ?? 'var(--vtt-border)'

  const circleClass = `relative touch-none rounded-full border-2 border-[var(--vtt-border)] bg-[var(--vtt-surface)] focus-visible:z-[1001] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vtt-gold)] ${
    isGhost
      ? 'vtt-token-shell z-[9] opacity-40 ring-2 ring-[var(--vtt-gold)]/60 ring-offset-1 ring-offset-transparent animate-pulse'
      : isDragging
        ? 'vtt-token-shell z-[1000] scale-105 ring-2 ring-[var(--vtt-gold)] ring-offset-2 ring-offset-[var(--vtt-bg)]'
        : `vtt-token-shell z-[10] ${isActiveTurn ? 'vtt-token-shell--active' : ''} ${isIdleCandidate ? 'vtt-token-shell--idle' : ''}`
  }`

  const nameBlock = showNameLabel ? (
    <span
      className="pointer-events-none z-[5] mt-0.5 max-w-[min(10rem,40vw)] truncate rounded bg-black/75 px-1.5 py-px text-center font-vtt-display text-[0.65rem] font-semibold leading-tight text-[var(--vtt-gold)] shadow-sm ring-1 ring-black/40"
      aria-hidden
    >
      {token.name}
    </span>
  ) : null

  const hpBlock =
    hpMax > 0 || hpCurrent > 0 || hpTemp > 0 ? (
      <div className="vtt-token-hp mt-1 w-[min(5.9rem,18vw)]" aria-hidden>
        <div className="vtt-token-hp__frame overflow-hidden rounded-full">
          <div className="vtt-token-hp__track relative h-2.5 w-full">
            <div
              className="vtt-token-hp__fill absolute inset-y-0 left-0"
              style={{ width: `${currentPct}%` }}
            />
            {tempPct > 0 ? (
              <div
                className="vtt-token-hp__temp absolute inset-y-0"
                style={{ left: `${currentPct}%`, width: `${tempPct}%` }}
              />
            ) : null}
          </div>
        </div>
        <p className="vtt-token-hp__label mt-0.5 text-center font-vtt-display text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-[var(--vtt-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {hpCurrent}/{hpMax}
          {hpTemp > 0 ? ` +${hpTemp}` : ''}
        </p>
      </div>
    ) : null

  const reactionEmoji =
    reactionBurst !== null ? (getQuickReaction(reactionBurst.reactionId)?.emoji ?? '✨') : null

  const inner = (
    <>
      {token.img ? (
        <img
          src={token.img}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full rounded-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--vtt-surface-warm)] font-vtt-display text-xs font-semibold text-[var(--vtt-gold)]">
          {token.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {conds.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[4] flex flex-wrap content-start justify-center gap-0.5 px-0.5 pt-0.5"
          aria-hidden
        >
          {conds.map((c, i) => {
            const v = resolveConditionVisual(c)
            const anim = conditionAnimationClass(v.animation)
            const fs = Math.max(10, Math.round(badgeSize * 0.52))
            return (
              <span
                key={`${token.id}-${i}-${c}`}
                title={c}
                className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-mono leading-none shadow-md ${anim}`}
                style={{
                  width: badgeSize,
                  height: badgeSize,
                  fontSize: fs,
                  borderColor: v.accent,
                  background: v.background,
                  color: v.accent,
                }}
              >
                {v.icon}
              </span>
            )
          })}
        </div>
      ) : null}
      {handRaised ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 z-[6] flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full border-2 border-[var(--vtt-gold)] bg-[var(--vtt-bg-elevated)] text-sm shadow-md"
          title="Mano levantada"
          aria-hidden
        >
          ✋
        </span>
      ) : null}
    </>
  )

  const reactionBlock =
    reactionBurst !== null ? (
      <div
        className="pointer-events-none relative z-[25] mb-0.5 flex min-h-[3rem] w-full items-end justify-center"
        aria-hidden
      >
        <span
          key={reactionBurst.key}
          className="vtt-token-reaction-float text-[1.85rem] leading-none"
        >
          {reactionEmoji}
        </span>
      </div>
    ) : null

  if (isGhost) {
    return (
      <div
        className={columnClass}
        style={{ left: token.x - half, top: token.y - half }}
        aria-hidden
      >
        <div
          className={`vtt-token ${circleClass} pointer-events-none`}
          style={{ ...circleStyle, borderColor: tokenBorderColor }}
        >
          {isActiveTurn ? <span className="vtt-token-turn-aura" aria-hidden /> : null}
          {inner}
        </div>
      </div>
    )
  }

  if (canDrag) {
    return (
      <div className={columnClass} style={{ left: token.x - half, top: token.y - half }}>
        {reactionBlock}
        <button
          type="button"
          data-vtt-token
          data-token-id={token.id}
          aria-label={`${token.name}, ${kind}.${conditionsAria} Usa flechas para mover; Mayús aumenta el paso.`}
          title={`${token.name} — arrastra o usa flechas para mover`}
          className={`vtt-token ${circleClass} pointer-events-auto cursor-grab active:cursor-grabbing`}
          style={{ ...circleStyle, borderColor: tokenBorderColor }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return
            onPointerDown(e, token)
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onKeyDown={onKeyDown ? (e) => onKeyDown(e, token) : undefined}
        >
          {isActiveTurn ? <span className="vtt-token-turn-aura" aria-hidden /> : null}
          {inner}
        </button>
        {hpBlock}
        {nameBlock}
      </div>
    )
  }

  return (
    <div className={columnClass} style={{ left: token.x - half, top: token.y - half }}>
      {reactionBlock}
      <div
        data-vtt-token
        data-token-id={token.id}
        role="img"
        aria-label={`${token.name}, ${kind}.${conditionsAria}`}
        title={`${token.name} — no puedes moverlo`}
        className={`vtt-token ${circleClass} pointer-events-none opacity-75`}
        style={{ ...circleStyle, borderColor: tokenBorderColor }}
      >
        {isActiveTurn ? <span className="vtt-token-turn-aura" aria-hidden /> : null}
        {inner}
      </div>
      {hpBlock}
      {nameBlock}
    </div>
  )
}
