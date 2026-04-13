import type { Socket } from 'socket.io'
import type { RoomState } from './types.js'
import { DM_SECRET } from './dm-secret.js'
import type { VttSocketData } from './socket-data.js'

const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/

export type ParsedJoinPayload = {
  roomId: string
  playerSessionId?: string
  dmKey?: string
  /** Contraseña de mesa (texto plano en tránsito; usar HTTPS en producción). */
  sessionPassword?: string
}

export function parseJoinPayload(payload: unknown): ParsedJoinPayload | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.roomId !== 'string' || !o.roomId.trim()) return null
  const roomId = o.roomId.trim()
  const playerSessionId =
    typeof o.playerSessionId === 'string' && o.playerSessionId.trim()
      ? o.playerSessionId.trim()
      : undefined
  const dmKey =
    typeof o.dmKey === 'string' && o.dmKey.length > 0 ? o.dmKey : undefined
  const sessionPassword =
    typeof o.sessionPassword === 'string' && o.sessionPassword.length > 0
      ? o.sessionPassword.slice(0, 128)
      : undefined
  return { roomId, playerSessionId, dmKey, sessionPassword }
}

function bindReturningPlayer(room: RoomState, socket: Socket, sessionId: string) {
  for (const t of room.tokens) {
    if (t.type === 'pc' && t.claimedBy === sessionId) {
      t.ownerSocket = socket.id
      return t.id
    }
  }
  return undefined
}

export function applyJoinSession(
  socket: Socket,
  room: RoomState,
  parsed: ParsedJoinPayload,
): boolean {
  const data = socket.data as VttSocketData
  delete data.isDm
  delete data.playerSessionId
  delete data.claimedTokenId

  if (parsed.dmKey !== undefined) {
    if (parsed.dmKey !== DM_SECRET) {
      socket.emit('roomError', { message: 'Clave de DM incorrecta' })
      return false
    }
    data.isDm = true
    socket.emit('sessionState', {
      role: 'dm' as const,
      claimedTokenId: null as string | null,
    })
    return true
  }

  const sid = parsed.playerSessionId
  if (!sid || !SESSION_ID_RE.test(sid)) {
    socket.emit('roomError', {
      message: 'Se requiere playerSessionId válido para jugar como jugador',
    })
    return false
  }

  data.isDm = false
  data.playerSessionId = sid

  const reclaimed = bindReturningPlayer(room, socket, sid)
  if (reclaimed) {
    data.claimedTokenId = reclaimed
    socket.emit('sessionState', {
      role: 'player' as const,
      claimedTokenId: reclaimed,
    })
  } else {
    socket.emit('sessionState', {
      role: 'player' as const,
      claimedTokenId: null,
    })
  }

  return true
}
