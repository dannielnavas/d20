import type { Server, Socket } from 'socket.io'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { RoomState } from './types.js'
import type { VttSocketData } from './socket-data.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

const MAX_REACTION_ID = 5
const MAX_PER_SECOND = 12

function authorLabel(room: RoomState, data: VttSocketData): string {
  if (data.isDm) return 'DM'
  if (data.claimedTokenId) {
    const t = findTokenInRoom(room, data.claimedTokenId)
    return t?.name ?? 'Jugador'
  }
  return 'Jugador'
}

/**
 * Reacción visual a pantalla completa (no ligada a ficha). Todos los no-espectadores.
 * Cliente → `screenReaction` { reactionId: 0–5 }
 */
export function registerScreenReactionHandlers(io: Server, socket: Socket) {
  socket.on('screenReaction', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'screenReaction', MAX_PER_SECOND)) return

    if (typeof payload !== 'object' || payload === null) return
    let o = payload as Record<string, unknown>
    if (Array.isArray(payload) && payload[0] && typeof payload[0] === 'object') {
      o = payload[0] as Record<string, unknown>
    }
    const raw = o.reactionId
    const reactionId =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.round(raw)
        : typeof raw === 'string'
          ? Number.parseInt(raw, 10)
          : NaN
    if (!Number.isInteger(reactionId) || reactionId < 0 || reactionId > MAX_REACTION_ID) return

    const room = getOrCreateRoom(roomId)
    const fromLabel = authorLabel(room, data)
    io.to(roomId).emit('screenReaction', {
      reactionId,
      ts: Date.now(),
      fromLabel,
    })
  })
}
