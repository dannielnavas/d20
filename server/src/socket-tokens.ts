import type { Server, Socket } from 'socket.io'
import { snapToGrid } from './snap.js'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'
import type { Token } from './types.js'

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
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseTokenMovePayload(payload)
    if (!parsed) return

    const room = getOrCreateRoom(roomId)
    const token = room.tokens.find((t) => t.id === parsed.tokenId)
    if (!token) {
      socket.emit('tokenError', { tokenId: parsed.tokenId, message: 'Token no encontrado' })
      return
    }

    if (!canMoveToken(socket, token)) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'No puedes mover este token',
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
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseTokenMovePayload(payload)
    if (!parsed) return

    const room = getOrCreateRoom(roomId)
    const token = room.tokens.find((t) => t.id === parsed.tokenId)
    if (!token) {
      socket.emit('tokenError', { tokenId: parsed.tokenId, message: 'Token no encontrado' })
      return
    }

    if (!canMoveToken(socket, token)) {
      socket.emit('tokenError', {
        tokenId: parsed.tokenId,
        message: 'No puedes mover este token',
      })
      return
    }

    let { x, y } = parsed
    if (room.settings.snapToGrid) {
      const snapped = snapToGrid(x, y, room.settings.gridSize)
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
  })
}
