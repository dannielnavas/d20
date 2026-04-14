import { useEffect, useRef } from 'react'
import type { RoomState } from '../../types/room'
import { findTokenInRoomState } from '../../utils/roomTokens'
import type { SessionState } from '../../types/session'

const TITLE_MY_TURN = '¡Tu turno! — d20'

function getCurrentInitiativeTokenId(state: RoomState): string | null {
  const { order, currentIndex } = state.initiative
  if (currentIndex === null || currentIndex < 0 || currentIndex >= order.length) return null
  const id = order[currentIndex]
  return typeof id === 'string' ? id : null
}

/**
 * Jugador con PJ reclamado: al pasar a su turno en iniciativa, actualiza el título de la pestaña
 * y muestra una Notification del navegador si hay permiso.
 */
export function useInitiativeTurnNotify(
  state: RoomState | null,
  session: SessionState | null,
): void {
  const defaultTitleRef = useRef(
    typeof document !== 'undefined' ? document.title : 'd20 — mesa virtual',
  )
  const prevMyTurnRef = useRef(false)

  useEffect(() => {
    const base = defaultTitleRef.current

    if (!state || !session || session.role !== 'player' || !session.claimedTokenId) {
      if (prevMyTurnRef.current) {
        document.title = base
        prevMyTurnRef.current = false
      }
      return
    }

    const currentTokenId = getCurrentInitiativeTokenId(state)
    const isMyTurn = currentTokenId === session.claimedTokenId

    if (isMyTurn && !prevMyTurnRef.current) {
      document.title = TITLE_MY_TURN
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const token = findTokenInRoomState(state, session.claimedTokenId)
        const name = token?.name ?? 'Tu personaje'
        try {
          new Notification('¡Tu turno!', {
            body: `Te toca actuar como ${name}.`,
            tag: `d20-initiative-${state.roomId}-${state.roomVersion}`,
            silent: false,
          })
        } catch {
          /* algunos entornos restringen Notification */
        }
      }
    } else if (!isMyTurn && prevMyTurnRef.current) {
      document.title = base
    }

    prevMyTurnRef.current = isMyTurn
  }, [state, session])

  useEffect(() => {
    return () => {
      document.title = defaultTitleRef.current
    }
  }, [])
}
