import type { Server, Socket } from 'socket.io'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

const MAX_REACTION_ID = 5
/** Por ventana de 1 s (mismo esquema que mapPing). */
const MAX_PER_SECOND = 12

function isOnMapToken(token: { type: string; onMap?: boolean }): boolean {
  if (token.type !== 'npc') return true
  return token.onMap !== false
}

/**
 * Reacción visual efímera sobre una ficha: no se guarda en el estado de la sala.
 * Cliente → `tokenReaction` { reactionId: 0–5 }; jugador usa su `claimedTokenId`.
 * DM opcional: { reactionId, tokenId } para reaccionar sobre cualquier ficha en mapa.
 */
export function registerTokenReactionHandlers(io: Server, socket: Socket) {
  socket.on('tokenReaction', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'tokenReaction', MAX_PER_SECOND)) return

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const raw = o.reactionId
    const reactionId =
      typeof raw === 'number' && Number.isInteger(raw)
        ? raw
        : typeof raw === 'string'
          ? Number.parseInt(raw, 10)
          : NaN
    if (!Number.isInteger(reactionId) || reactionId < 0 || reactionId > MAX_REACTION_ID) return

    const room = getOrCreateRoom(roomId)

    let tokenId: string | undefined

    if (data.isDm) {
      const tid = typeof o.tokenId === 'string' ? o.tokenId.trim() : ''
      if (!tid) return
      const t = findTokenInRoom(room, tid)
      if (!t || !isOnMapToken(t)) return
      tokenId = tid
    } else {
      const cid = data.claimedTokenId
      if (!cid) return
      const t = findTokenInRoom(room, cid)
      if (!t || !isOnMapToken(t)) return
      tokenId = cid
    }

    io.to(roomId).emit('tokenReaction', { tokenId, reactionId, ts: Date.now() })
  })
}
