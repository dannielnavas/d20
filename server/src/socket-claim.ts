import type { Server, Socket } from 'socket.io'
import { publicRoomState } from './room-session-password.js'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'

function parseClaim(payload: unknown): { tokenId: string } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.tokenId !== 'string' || !o.tokenId.trim()) return null
  return { tokenId: o.tokenId.trim() }
}

export function registerClaimHandler(io: Server, socket: Socket) {
  socket.on('claimPc', (payload: unknown) => {
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) {
      socket.emit('claimError', { message: 'No estás en una sala' })
      return
    }
    if (data.isDm) {
      socket.emit('claimError', { message: 'El DM no reclama personaje aquí' })
      return
    }
    if (!data.playerSessionId) {
      socket.emit('claimError', { message: 'Sesión de jugador inválida' })
      return
    }
    if (data.claimedTokenId) {
      socket.emit('claimError', { message: 'Ya tienes un personaje asignado' })
      return
    }

    const parsed = parseClaim(payload)
    if (!parsed) {
      socket.emit('claimError', { message: 'Payload inválido' })
      return
    }

    const room = getOrCreateRoom(roomId)
    const token = room.tokens.find((t) => t.id === parsed.tokenId)
    if (!token) {
      socket.emit('claimError', { message: 'Personaje no encontrado' })
      return
    }
    if (token.type !== 'pc') {
      socket.emit('claimError', { message: 'Solo puedes elegir un PJ (PC)' })
      return
    }
    if (token.claimedBy !== null) {
      socket.emit('claimError', { message: 'Ese personaje ya está en uso' })
      return
    }

    token.claimedBy = data.playerSessionId
    token.ownerSocket = socket.id
    data.claimedTokenId = token.id

    socket.emit('sessionState', {
      role: 'player' as const,
      claimedTokenId: token.id,
    })
    io.to(roomId).emit('roomState', publicRoomState(room))
  })
}
