import type { Server, Socket } from 'socket.io'
import { getOrCreateRoom } from './rooms.js'
import { allowSocketEvent } from './rate-limit.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'

const MAX_URL_LEN = 2048
export const IMAGE_REVEAL_DURATION_MS = 10_000

function parseHttpImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().slice(0, MAX_URL_LEN)
  if (!t) return null
  let u: URL
  try {
    u = new URL(t)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  return u.toString()
}

export function registerImageRevealHandlers(io: Server, socket: Socket) {
  socket.on('imageReveal', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'imageReveal', 2)) return

    const room = getOrCreateRoom(roomId)
    const isDm = data.isDm === true

    if (!isDm) {
      if (!data.playerSessionId || !data.claimedTokenId) {
        socket.emit('roomError', {
          message: 'Necesitas un personaje reclamado para mostrar una imagen.',
        })
        return
      }
      if (!room.settings.playersCanRevealImage) {
        socket.emit('roomError', {
          message: 'El director no ha permitido que los jugadores muestren imágenes a la mesa.',
        })
        return
      }
    }

    let url: string | null = null
    if (typeof payload === 'object' && payload !== null) {
      url = parseHttpImageUrl((payload as Record<string, unknown>).url)
    }
    if (!url) {
      socket.emit('roomError', {
        message: 'Pega una URL válida (http o https) de una imagen.',
      })
      return
    }

    io.to(roomId).emit('imageReveal', {
      url,
      durationMs: IMAGE_REVEAL_DURATION_MS,
    })
  })
}
