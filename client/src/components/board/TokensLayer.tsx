import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import type { Socket } from 'socket.io-client'
import { useTransformComponent } from 'react-zoom-pan-pinch'
import { snapToGrid as snapWorld } from '../../utils/snapToGrid'
import type { RoomState, Token } from '../../types/room'
import { mapTokensInActiveScene } from '../../utils/activeSceneTokens'
import { clientToWorld } from './clientToWorld'
import { TokenSprite } from './TokenSprite'

function isVisibleOnMap(t: Token): boolean {
  if (t.type !== 'npc') return true
  return t.onMap !== false
}

/** Emisión al servidor alineada a frame (evita spam más allá del refresh). */

export type TokensLayerProps = {
  socket: Socket
  tokens: Token[]
  setRoomState: Dispatch<SetStateAction<RoomState | null>>
  viewportRef: React.RefObject<HTMLDivElement | null>
  canDragToken: (token: Token) => boolean
  /** Tamaño de cuadrícula del mapa (mismo que settings.gridSize). */
  gridSize: number
  snapToGrid: boolean
  showTokenNames: boolean
  activeTurnTokenId?: string | null
  /** Manos levantadas (ids de sesión); badge solo si el DM debe verlas. */
  raisedHands?: string[]
  showRaiseHandForDm?: boolean
}

type DragRef = {
  tokenId: string
  offsetX: number
  offsetY: number
  pointerId: number
  captureEl: HTMLElement
}

export function TokensLayer({
  socket,
  tokens,
  setRoomState,
  viewportRef,
  canDragToken,
  gridSize,
  snapToGrid,
  showTokenNames,
  activeTurnTokenId = null,
  raisedHands = [],
  showRaiseHandForDm = false,
}: TokensLayerProps) {
  const { scale, positionX, positionY } = useTransformComponent((c) => c.state)
  const transformRef = useRef({ positionX, positionY, scale })
  transformRef.current = { positionX, positionY, scale }

  const tokensOnMap = useMemo(() => tokens.filter(isVisibleOnMap), [tokens])

  const dragRef = useRef<DragRef | null>(null)
  const rafEmitRef = useRef<number | null>(null)
  const pendingEmitRef = useRef<{ tokenId: string; x: number; y: number } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Posiciones fantasma: tokens que OTROS usuarios están arrastrando
  const [ghostPositions, setGhostPositions] = useState<Record<string, { x: number; y: number }>>({})
  const ghostClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const onRemoteMove = (p: { tokenId?: string; x?: unknown; y?: unknown }) => {
      if (typeof p.tokenId !== 'string') return
      if (typeof p.x !== 'number' || typeof p.y !== 'number') return
      // Solo aplicar si NO somos nosotros los que arrastramos ese token
      if (dragRef.current?.tokenId === p.tokenId) return
      setGhostPositions((prev) => ({ ...prev, [p.tokenId!]: { x: p.x as number, y: p.y as number } }))
      // Limpiar el fantasma si no llegan más eventos en 800ms (arrastre terminó)
      const existing = ghostClearTimers.current.get(p.tokenId!)
      if (existing) clearTimeout(existing)
      const t = setTimeout(() => {
        setGhostPositions((prev) => {
          const next = { ...prev }
          delete next[p.tokenId!]
          return next
        })
        ghostClearTimers.current.delete(p.tokenId!)
      }, 800)
      ghostClearTimers.current.set(p.tokenId!, t)
    }
    socket.on('tokenMove', onRemoteMove)
    return () => {
      socket.off('tokenMove', onRemoteMove)
      ghostClearTimers.current.forEach((t) => clearTimeout(t))
      ghostClearTimers.current.clear()
    }
  }, [socket])

  const [reactionByToken, setReactionByToken] = useState<
    Record<string, { reactionId: number; key: number }>
  >({})
  const reactionTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const onReaction = (p: { tokenId?: string; reactionId?: unknown; ts?: unknown }) => {
      if (typeof p.tokenId !== 'string') return
      const raw = p.reactionId
      const reactionId =
        typeof raw === 'number' && Number.isInteger(raw)
          ? raw
          : typeof raw === 'string'
            ? Number.parseInt(raw, 10)
            : NaN
      if (!Number.isInteger(reactionId) || reactionId < 0 || reactionId > 5) return
      const tokenId = p.tokenId
      const ts = typeof p.ts === 'number' ? p.ts : Date.now()
      setReactionByToken((prev) => ({
        ...prev,
        [tokenId]: { reactionId, key: ts },
      }))
      const prevT = reactionTimeoutsRef.current.get(tokenId)
      if (prevT) clearTimeout(prevT)
      const t = setTimeout(() => {
        setReactionByToken((prev) => {
          const cur = prev[tokenId]
          if (!cur || cur.key !== ts) return prev
          const next = { ...prev }
          delete next[tokenId]
          return next
        })
        reactionTimeoutsRef.current.delete(tokenId)
      }, 3000)
      reactionTimeoutsRef.current.set(tokenId, t)
    }
    socket.on('tokenReaction', onReaction)
    return () => {
      socket.off('tokenReaction', onReaction)
      for (const tid of reactionTimeoutsRef.current.keys()) {
        const to = reactionTimeoutsRef.current.get(tid)
        if (to) clearTimeout(to)
      }
      reactionTimeoutsRef.current.clear()
    }
  }, [socket])

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
        return mapTokensInActiveScene(prev, (tokens) =>
          tokens.map((t) => (t.id === d.tokenId ? { ...t, x: nx, y: ny } : t)),
        )
      })

      pendingEmitRef.current = { tokenId: d.tokenId, x: nx, y: ny }
      if (rafEmitRef.current === null) {
        rafEmitRef.current = requestAnimationFrame(() => {
          rafEmitRef.current = null
          const p = pendingEmitRef.current
          if (p) socket.emit('tokenMove', p)
        })
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
      if (rafEmitRef.current !== null) {
        cancelAnimationFrame(rafEmitRef.current)
        rafEmitRef.current = null
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [endDrag, setRoomState, socket, viewportRef])

  const onTokenKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, token: Token) => {
      if (!canDragToken(token)) return
      const key = e.key
      if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
        return
      }
      e.preventDefault()
      e.stopPropagation()

      const g = Math.max(8, Math.min(gridSize, 120))
      const step = e.shiftKey ? g * 2 : g
      let dx = 0
      let dy = 0
      if (key === 'ArrowLeft') dx = -step
      if (key === 'ArrowRight') dx = step
      if (key === 'ArrowUp') dy = -step
      if (key === 'ArrowDown') dy = step

      let nx = token.x + dx
      let ny = token.y + dy
      if (snapToGrid) {
        const s = snapWorld(nx, ny, gridSize)
        nx = s.x
        ny = s.y
      }

      setRoomState((prev) => {
        if (!prev) return prev
        return mapTokensInActiveScene(prev, (tokens) =>
          tokens.map((t) => (t.id === token.id ? { ...t, x: nx, y: ny } : t)),
        )
      })
      socket.emit('tokenMove', { tokenId: token.id, x: nx, y: ny })
      socket.emit('tokenMoveEnd', { tokenId: token.id, x: nx, y: ny })
    },
    [canDragToken, gridSize, setRoomState, snapToGrid, socket],
  )

  const onTokenPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>, token: Token) => {
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
      pendingEmitRef.current = null
      socket.emit('tokenMove', { tokenId: token.id, x: token.x, y: token.y })
    },
    [canDragToken, socket, viewportRef],
  )

  return (
    <div className="pointer-events-none absolute inset-0" data-board-layer="tokens">
      {tokensOnMap.map((t) => (
        <TokenSprite
          key={t.id}
          token={t}
          showNameLabel={showTokenNames}
          isDragging={draggingId === t.id}
          isActiveTurn={activeTurnTokenId === t.id}
          isIdleCandidate={canDragToken(t) && draggingId !== t.id}
          canDrag={canDragToken(t)}
          onPointerDown={onTokenPointerDown}
          onKeyDown={onTokenKeyDown}
          reactionBurst={reactionByToken[t.id] ?? null}
          handRaised={
            showRaiseHandForDm && Boolean(t.claimedBy && raisedHands.includes(t.claimedBy))
          }
        />
      ))}
      {/* Tokens fantasma: previews de arrastres remotos */}
      {tokensOnMap
        .filter((t) => ghostPositions[t.id] && draggingId !== t.id)
        .map((t) => {
          const ghost = ghostPositions[t.id]!
          return (
            <TokenSprite
              key={`ghost-${t.id}`}
              token={{ ...t, x: ghost.x, y: ghost.y }}
              showNameLabel={false}
              isDragging={false}
              isActiveTurn={false}
              isIdleCandidate={false}
              canDrag={false}
              onPointerDown={() => {}}
              reactionBurst={null}
              handRaised={false}
              isGhost
            />
          )
        })}
    </div>
  )
}
