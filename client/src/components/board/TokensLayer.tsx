import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Socket } from 'socket.io-client'
import { useTransformComponent } from 'react-zoom-pan-pinch'
import type { RoomState, Token } from '../../types/room'
import { clientToWorld } from './clientToWorld'
import { TokenSprite } from './TokenSprite'

const EMIT_MS = 16

export type TokensLayerProps = {
  socket: Socket
  tokens: Token[]
  setRoomState: Dispatch<SetStateAction<RoomState | null>>
  viewportRef: React.RefObject<HTMLDivElement | null>
  canDragToken: (token: Token) => boolean
}

type DragRef = {
  tokenId: string
  offsetX: number
  offsetY: number
  pointerId: number
  captureEl: HTMLElement
}

export function TokensLayer({ socket, tokens, setRoomState, viewportRef, canDragToken }: TokensLayerProps) {
  const { scale, positionX, positionY } = useTransformComponent((c) => c.state)
  const transformRef = useRef({ positionX, positionY, scale })
  transformRef.current = { positionX, positionY, scale }

  const dragRef = useRef<DragRef | null>(null)
  const lastEmitRef = useRef(0)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const endDrag = useCallback(() => {
    const d = dragRef.current
    dragRef.current = null
    setDraggingId(null)
    if (d?.captureEl) {
      try {
        d.captureEl.releasePointerCapture(d.pointerId)
      } catch {
        /* ya liberado o inválido */
      }
    }
  }, [])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return

      const vp = viewportRef.current?.getBoundingClientRect()
      if (!vp) return

      const { positionX: px, positionY: py, scale: sc } = transformRef.current
      const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY, vp, px, py, sc)
      const nx = wx + d.offsetX
      const ny = wy + d.offsetY

      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tokens: prev.tokens.map((t) =>
            t.id === d.tokenId ? { ...t, x: nx, y: ny } : t,
          ),
        }
      })

      const now = performance.now()
      if (now - lastEmitRef.current >= EMIT_MS) {
        lastEmitRef.current = now
        socket.emit('tokenMove', { tokenId: d.tokenId, x: nx, y: ny })
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return

      const vp = viewportRef.current?.getBoundingClientRect()
      if (vp) {
        const { positionX: px, positionY: py, scale: sc } = transformRef.current
        const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY, vp, px, py, sc)
        const nx = wx + d.offsetX
        const ny = wy + d.offsetY
        socket.emit('tokenMoveEnd', { tokenId: d.tokenId, x: nx, y: ny })
      }

      endDrag()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [endDrag, setRoomState, socket, viewportRef])

  const onTokenPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, token: Token) => {
      if (!canDragToken(token)) return
      e.preventDefault()
      e.stopPropagation()
      const vp = viewportRef.current?.getBoundingClientRect()
      if (!vp) return

      const { positionX: px, positionY: py, scale: sc } = transformRef.current
      const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY, vp, px, py, sc)

      dragRef.current = {
        tokenId: token.id,
        offsetX: token.x - wx,
        offsetY: token.y - wy,
        pointerId: e.pointerId,
        captureEl: e.currentTarget,
      }
      setDraggingId(token.id)
      e.currentTarget.setPointerCapture(e.pointerId)
      lastEmitRef.current = 0
      socket.emit('tokenMove', { tokenId: token.id, x: token.x, y: token.y })
    },
    [canDragToken, socket, viewportRef],
  )

  return (
    <div className="pointer-events-none absolute inset-0" data-board-layer="tokens">
      {tokens.map((t) => (
        <TokenSprite
          key={t.id}
          token={t}
          isDragging={draggingId === t.id}
          canDrag={canDragToken(t)}
          onPointerDown={onTokenPointerDown}
        />
      ))}
    </div>
  )
}
