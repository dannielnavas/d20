import type { Socket } from 'socket.io'
import type { RoomState } from './types.js'
import { DM_SECRET } from './dm-secret.js'
import { verifyDmJwt } from './auth-dm.js'
import type { VttSocketData } from './socket-data.js'

const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/

export type ParsedJoinPayload = {
  roomId: string
  playerSessionId?: string
  dmKey?: string
  dmToken?: string
  sessionPassword?: string
  /** Modo solo lectura (stream / observador). */
  spectator?: boolean
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
  const dmKey = typeof o.dmKey === 'string' && o.dmKey.length > 0 ? o.dmKey : undefined
  const dmToken =
    typeof o.dmToken === 'string' && o.dmToken.trim().length > 0 ? o.dmToken.trim() : undefined
  const sessionPassword =
    typeof o.sessionPassword === 'string' && o.sessionPassword.length > 0
      ? o.sessionPassword.slice(0, 128)
      : undefined
  const spectator = o.spectator === true
  return { roomId, playerSessionId, dmKey, dmToken, sessionPassword, spectator }
}

function bindReturningPlayer(room: RoomState, socket: Socket, sessionId: string) {
  for (const sc of room.scenes) {
    for (const t of sc.tokens) {
      if (t.type === 'pc' && t.claimedBy === sessionId) {
        t.ownerSocket = socket.id
        return t.id
      }
    }
  }
  return undefined
}

export async function applyJoinSession(
  socket: Socket,
  room: RoomState,
  parsed: ParsedJoinPayload,
): Promise<boolean> {
  const data = socket.data as VttSocketData
  delete data.isDm
  delete data.isSpectator
  delete data.playerSessionId
  delete data.claimedTokenId

  if (parsed.dmToken !== undefined) {
    const ok = await verifyDmJwt(parsed.dmToken)
    if (!ok) {
      socket.emit('roomError', {
        message:
          'Tu enlace de director de juego caducó o no es válido. Abre de nuevo el enlace que te pasó el anfitrión o pídele uno nuevo.',
      })
      return false
    }
    data.isDm = true
    socket.emit('sessionState', {
      role: 'dm' as const,
      claimedTokenId: null as string | null,
    })
    return true
  }

  if (parsed.dmKey !== undefined) {
    if (parsed.dmKey !== DM_SECRET) {
      socket.emit('roomError', {
        message: 'La clave de director de juego no coincide. Revísala o pide el enlace correcto.',
      })
      return false
    }
    data.isDm = true
    socket.emit('sessionState', {
      role: 'dm' as const,
      claimedTokenId: null as string | null,
    })
    return true
  }

  if (parsed.spectator) {
    data.isSpectator = true
    data.isDm = false
    socket.emit('sessionState', {
      role: 'spectator' as const,
      claimedTokenId: null as string | null,
    })
    return true
  }

  const sid = parsed.playerSessionId
  if (!sid || !SESSION_ID_RE.test(sid)) {
    socket.emit('roomError', {
      message:
        'Para jugar necesitas el enlace de invitación que compartió el director de juego. Ábrelo desde el correo o el chat del grupo.',
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
