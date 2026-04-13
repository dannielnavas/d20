import type { Token } from '../../types/room'

export type TokenSpriteProps = {
  token: Token
  isDragging: boolean
  canDrag: boolean
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, token: Token) => void
}

export function TokenSprite({ token, isDragging, canDrag, onPointerDown }: TokenSpriteProps) {
  const half = token.size / 2

  const kind = token.type === 'pc' ? 'personaje' : 'PNJ'

  return (
    <div
      data-token-id={token.id}
      role="img"
      aria-label={`${token.name}, ${kind}`}
      title={canDrag ? `${token.name} — arrastra para mover` : `${token.name} — no puedes moverlo`}
      className={`vtt-token absolute touch-none rounded-full border-2 border-[var(--vtt-border)] bg-[var(--vtt-surface)] shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
        canDrag ? 'pointer-events-auto' : 'pointer-events-none opacity-75'
      } ${
        isDragging
          ? 'z-[1000] scale-105 ring-2 ring-[var(--vtt-gold)] ring-offset-2 ring-offset-[var(--vtt-bg)]'
          : 'z-[10]'
      }`}
      style={{
        left: token.x - half,
        top: token.y - half,
        width: token.size,
        height: token.size,
      }}
      onPointerDown={(e) => {
        if (!canDrag || e.button !== 0) return
        onPointerDown(e, token)
      }}
    >
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
    </div>
  )
}
