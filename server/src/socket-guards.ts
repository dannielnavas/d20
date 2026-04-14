import type { Socket } from 'socket.io'
import type { VttSocketData } from './socket-data.js'

export function assertNotSpectator(socket: Socket): boolean {
  const d = socket.data as VttSocketData
  if (d.isSpectator) {
    socket.emit('roomError', {
      message:
        'En modo espectador solo ves la mesa: no puedes mover fichas ni escribir en el chat.',
    })
    return false
  }
  return true
}
