import type { Socket } from 'socket.io'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'

export function clearTokenSocketsOnLeave(socket: Socket) {
  const data = socket.data as VttSocketData
  const roomId = data.roomId
  if (!roomId || data.isDm) return

  const room = getOrCreateRoom(roomId)
  for (const sc of room.scenes) {
    for (const t of sc.tokens) {
      if (t.ownerSocket === socket.id) {
        t.ownerSocket = null
      }
    }
  }
}
