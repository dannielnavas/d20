import type { Socket } from 'socket.io'
import type { VttSocketData } from './socket-data.js'

export function assertDm(socket: Socket): boolean {
  const d = socket.data as VttSocketData
  if (!d.isDm) {
    socket.emit('dmError', { message: 'Solo el director de juego puede usar esta acción.' })
    return false
  }
  return true
}
