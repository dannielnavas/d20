import type { Server, Socket } from 'socket.io'
import { broadcastRoomState } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { allowSocketEvent } from './rate-limit.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'

function assertDm(socket: Socket): boolean {
  const d = socket.data as VttSocketData
  if (!d.isDm) {
    socket.emit('dmError', {
      message: 'Solo el director puede quitar la mano levantada de un jugador.',
    })
    return false
  }
  return true
}

export function registerRaiseHandHandlers(io: Server, socket: Socket) {
  socket.on('raiseHand', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const data = socket.data as VttSocketData
    if (data.isDm) return
    const sid = data.playerSessionId
    if (!sid) return
    if (!data.claimedTokenId) {
      socket.emit('roomError', {
        message: 'Reclama un personaje para levantar la mano.',
      })
      return
    }
    const roomId = data.roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'raiseHand', 8)) return

    let raised = true
    if (typeof payload === 'object' && payload !== null && 'raised' in payload) {
      raised = (payload as { raised?: unknown }).raised !== false
    }

    const room = getOrCreateRoom(roomId)
    const hands = [...(room.raisedHands ?? [])]
    if (raised) {
      if (!hands.includes(sid)) hands.push(sid)
    } else {
      const idx = hands.indexOf(sid)
      if (idx >= 0) hands.splice(idx, 1)
    }
    room.raisedHands = hands
    broadcastRoomState(io, room)
  })

  socket.on('raiseHandDismiss', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'raiseHandDismiss', 25)) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const playerSessionId = typeof o.playerSessionId === 'string' ? o.playerSessionId : ''
    if (!playerSessionId) return

    const room = getOrCreateRoom(roomId)
    const hands = room.raisedHands ?? []
    if (!hands.includes(playerSessionId)) return
    room.raisedHands = hands.filter((s) => s !== playerSessionId)
    broadcastRoomState(io, room)
  })
}
