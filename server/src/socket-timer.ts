import type { Server, Socket } from 'socket.io'
import { startRoomTimer, stopRoomTimer } from './room-timer.js'
import { assertDm } from './socket-dm-assert.js'
import type { VttSocketData } from './socket-data.js'

function parseSeconds(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.seconds !== 'number' || !Number.isFinite(o.seconds)) return null
  return o.seconds
}

export function registerTimerHandlers(io: Server, socket: Socket): void {
  socket.on('setTimer', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const secondsRaw = parseSeconds(payload)
    if (secondsRaw === null) return

    const seconds = Math.round(secondsRaw)
    if (seconds <= 0) {
      stopRoomTimer(io, roomId, true)
      return
    }

    startRoomTimer(io, roomId, seconds)
  })
}
