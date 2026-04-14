import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Socket } from 'socket.io-client'
import { useTransformComponent } from 'react-zoom-pan-pinch'
import { clientToWorld } from './clientToWorld'

type Ping = { id: string; x: number; y: number; by: string }

export type MapPingBridgeProps = {
  socket: Socket
  viewportRef: RefObject<HTMLDivElement | null>
  style?: CSSProperties
  children: ReactNode
  /** Si es false, no se emite ping (espectador o mesa sin ping para jugadores). */
  canEmitPing?: boolean
}

/**
 * Envuelve el lienzo del mapa (dentro de TransformComponent): Shift+clic para ping;
 * muestra pings recibidos por socket.
 */
export function MapPingBridge({
  socket,
  viewportRef,
  style,
  children,
  canEmitPing = true,
}: MapPingBridgeProps) {
  const { scale, positionX, positionY } = useTransformComponent((c) => c.state)
  const transformRef = useRef({ positionX, positionY, scale })
  transformRef.current = { positionX, positionY, scale }

  const [pings, setPings] = useState<Ping[]>([])

  useEffect(() => {
    const onPing = (p: { x: number; y: number; by: string; ts: number }) => {
      const id = `ping-${p.ts}-${Math.random().toString(36).slice(2, 8)}`
      setPings((prev) => [...prev.slice(-12), { id, x: p.x, y: p.y, by: p.by }])
      window.setTimeout(() => {
        setPings((prev) => prev.filter((x) => x.id !== id))
      }, 3500)
    }
    socket.on('mapPing', onPing)
    return () => {
      socket.off('mapPing', onPing)
    }
  }, [socket])

  return (
    <div
      className="relative shrink-0 select-none"
      style={style}
      onPointerDown={(e) => {
        if (!canEmitPing) return
        if (!e.shiftKey || e.button !== 0) return
        if ((e.target as HTMLElement).closest('[data-vtt-token]')) return
        const vp = viewportRef.current?.getBoundingClientRect()
        if (!vp) return
        const { positionX: px, positionY: py, scale: sc } = transformRef.current
        const { x, y } = clientToWorld(e.clientX, e.clientY, vp, px, py, sc)
        socket.emit('mapPing', { x, y })
      }}
    >
      {/* Pings debajo; fichas y reacciones encima (evita que la capa de ping tape la animación). */}
      <div className="pointer-events-none absolute inset-0 z-[18]" aria-hidden>
        {pings.map((p) => (
          <div
            key={p.id}
            className="absolute flex flex-col items-center"
            style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}
          >
            <span className="block size-12 rounded-full border-2 border-[var(--vtt-gold)] bg-[var(--vtt-gold)]/20 shadow-[0_0_24px_rgba(201,164,76,0.6)]" />
            <span className="mt-1 max-w-[8rem] truncate rounded bg-[var(--vtt-bg)]/90 px-1.5 py-0.5 font-mono text-[10px] text-[var(--vtt-gold)]">
              {p.by}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 z-[28] min-h-0 min-w-0">{children}</div>
    </div>
  )
}
