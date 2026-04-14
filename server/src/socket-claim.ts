import type { Server, Socket } from 'socket.io'
import { appendActivity } from './activity-log.js'
import { broadcastRoomState } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'

function parseClaim(payload: unknown): { tokenId: string } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.tokenId !== 'string' || !o.tokenId.trim()) return null
  return { tokenId: o.tokenId.trim() }
}

export function registerClaimHandler(io: Server, socket: Socket) {
  socket.on('claimPc', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) {
      socket.emit('claimError', {
        message: 'Primero entra a una mesa y vuelve a elegir personaje.',
      })
      return
    }
    if (data.isDm) {
      socket.emit('claimError', {
        message: 'El director de juego no elige ficha aquí; solo prepara la partida.',
      })
      return
    }
    if (!data.playerSessionId) {
      socket.emit('claimError', {
        message: 'No pudimos reconocer tu invitación. Abre otra vez el enlace de la mesa.',
      })
      return
    }
    if (data.claimedTokenId) {
      socket.emit('claimError', { message: 'Ya tienes personaje en esta mesa.' })
      return
    }

    const parsed = parseClaim(payload)
    if (!parsed) {
      socket.emit('claimError', {
        message: 'No pudimos completar la elección. Recarga la página e inténtalo otra vez.',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    const token = findTokenInRoom(room, parsed.tokenId)
    if (!token) {
      socket.emit('claimError', { message: 'Ese personaje ya no está disponible en la mesa.' })
      return
    }
    if (token.type !== 'pc') {
      socket.emit('claimError', {
        message: 'Solo puedes elegir a un héroe de jugador, no a un personaje no jugador.',
      })
      return
    }
    if (token.claimedBy !== null) {
      socket.emit('claimError', { message: 'Otro jugador ya está usando ese personaje.' })
      return
    }

    token.claimedBy = data.playerSessionId
    token.ownerSocket = socket.id
    data.claimedTokenId = token.id

    socket.emit('sessionState', {
      role: 'player' as const,
      claimedTokenId: token.id,
    })
    appendActivity(room, 'claim', `${token.name} reclamado por un jugador`)
    broadcastRoomState(io, room)
  })
}
