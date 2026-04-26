import type { Server, Socket } from 'socket.io'
import { schedulePersist } from './persistence.js'
import { snapToGrid } from './snap.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom, getActiveScene } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import type { Token } from './types.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

function parseTokenMovePayload(payload: unknown): { tokenId: string; x: number; y: number } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.tokenId !== 'string' || !o.tokenId.trim()) return null
  if (typeof o.x !== 'number' || typeof o.y !== 'number') return null
  if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) return null
  return { tokenId: o.tokenId.trim(), x: o.x, y: o.y }
}

function canMoveToken(socket: Socket, token: Token): boolean {
  const d = socket.data as VttSocketData
  if (d.isSpectator) return false
  if (d.isDm) return true
  if (token.type === 'npc') return false
  if (token.type !== 'pc') return false
  if (!token.claimedBy || !d.playerSessionId) return false
  if (token.claimedBy !== d.playerSessionId) return false
  if (token.id !== d.claimedTokenId) return false
  if (token.ownerSocket !== socket.id) return false
  return true
}

export function registerTokenHandlers(io: Server, socket: Socket) {
  socket.on('tokenMove', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'tokenMove', 90)) return

    const parsed = parseTokenMovePayload(payload)
    if (!parsed) return

    const room = getOrCreateRoom(roomId)
    const token = getActiveScene(room).tokens.find(t => t.id === parsed.tokenId)
    if (!token) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'Esa ficha ya no está en el mapa.',
      })
      return
    }

    if (token.type === 'npc' && token.onMap === false) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'Ese PNJ está en reserva: actívalo en el elenco antes de moverlo.',
      })
      return
    }

    if (!canMoveToken(socket, token)) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message:
          'No puedes mover esa ficha: la controla otro jugador o es un personaje no jugador.',
      })
      return
    }

    token.x = parsed.x
    token.y = parsed.y

    socket.broadcast.to(roomId).emit('tokenMove', {
      tokenId: token.id,
      x: token.x,
      y: token.y,
    })
  })

  socket.on('tokenMoveEnd', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'tokenMoveEnd', 25)) return

    const parsed = parseTokenMovePayload(payload)
    if (!parsed) return

    const room = getOrCreateRoom(roomId)
    const token = getActiveScene(room).tokens.find(t => t.id === parsed.tokenId)
    if (!token) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'Esa ficha ya no está en el mapa.',
      })
      return
    }

    if (token.type === 'npc' && token.onMap === false) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'Ese PNJ está en reserva: actívalo en el elenco antes de moverlo.',
      })
      return
    }

    if (!canMoveToken(socket, token)) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message:
          'No puedes mover esa ficha: la controla otro jugador o es un personaje no jugador.',
      })
      return
    }

    let { x, y } = parsed
    const ms = getActiveScene(room).settings
    if (ms.snapToGrid) {
      const snapped = snapToGrid(x, y, ms.gridSize)
      x = snapped.x
      y = snapped.y
    }

    token.x = x
    token.y = y

    io.to(roomId).emit('tokenMoveEnd', {
      tokenId: token.id,
      x: token.x,
      y: token.y,
    })
    schedulePersist()
  })
}
