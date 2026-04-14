import type { Server, Socket } from 'socket.io'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import type { RoomState } from './types.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

function authorShort(room: RoomState, data: VttSocketData): string {
  if (data.isDm) return 'DM'
  if (data.claimedTokenId) {
    const t = data.claimedTokenId ? findTokenInRoom(room, data.claimedTokenId) : undefined
    return t?.name ?? 'Jugador'
  }
  return 'Jugador'
}

export function registerMapPingHandlers(io: Server, socket: Socket) {
  socket.on('mapPing', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'mapPing', 8)) return

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.x !== 'number' || typeof o.y !== 'number') return
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) return

    const room = getOrCreateRoom(roomId)
    if (!data.isDm && room.settings.playersCanPing === false) return

    const by = authorShort(room, data)

    io.to(roomId).emit('mapPing', { x: o.x, y: o.y, by, ts: Date.now() })
  })
}
