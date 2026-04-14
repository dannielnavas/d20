import type { Server, Socket } from 'socket.io'
import { broadcastRoomState } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import { assertDm } from './socket-dm-assert.js'
import type { VttSocketData } from './socket-data.js'

export function registerMapToolsHandlers(io: Server, socket: Socket) {
  socket.on('tokenSetConditions', (payload: unknown) => {
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.tokenId !== 'string') return
    const condsRaw = Array.isArray(o.conditions) ? o.conditions : []
    const conditions = condsRaw
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim().slice(0, 32))
      .filter(Boolean)
      .slice(0, 6)

    const room = getOrCreateRoom(roomId)
    const token = findTokenInRoom(room, o.tokenId)
    if (!token) return

    if (data.isDm) {
      token.conditions = conditions
      broadcastRoomState(io, room)
      return
    }
    if (
      token.type === 'pc' &&
      data.playerSessionId &&
      token.claimedBy === data.playerSessionId &&
      token.id === data.claimedTokenId
    ) {
      token.conditions = conditions
      broadcastRoomState(io, room)
    }
  })

  socket.on('tokenSetSize', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.tokenId !== 'string' || !o.tokenId.trim()) return
    const tokenId = o.tokenId.trim()
    if (typeof o.size !== 'number' || !Number.isFinite(o.size)) return

    const size = Math.min(200, Math.max(24, Math.round(o.size)))
    const room = getOrCreateRoom(roomId)
    const token = findTokenInRoom(room, tokenId)
    if (!token) return

    token.size = size
    broadcastRoomState(io, room)
  })
}
