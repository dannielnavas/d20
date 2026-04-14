import { randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { broadcastRoomState, emitToPlayerSession } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'
import { allowSocketEvent } from './rate-limit.js'
import type { DiceMode, DieType, PendingRollRequest, RoomState } from './types.js'

const DIE_TYPES: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const D20_MODES: DiceMode[] = ['normal', 'advantage', 'disadvantage']

const MAX_REASON = 400
const MAX_QUEUE_GLOBAL = 40
const MAX_PENDING_PER_SESSION = 3

function parseRollRequestDice(payload: unknown): { dieType: DieType; mode: DiceMode } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (typeof o.dieType !== 'string' || !DIE_TYPES.includes(o.dieType as DieType)) {
    return null
  }
  const dieType = o.dieType as DieType
  const modeRaw =
    typeof o.mode === 'string' && D20_MODES.includes(o.mode as DiceMode)
      ? (o.mode as DiceMode)
      : 'normal'
  if (dieType !== 'd20' && modeRaw !== 'normal') return null
  return { dieType, mode: modeRaw }
}

function getPlayerLabel(room: RoomState, data: VttSocketData): string {
  if (data.claimedTokenId) {
    const token = findTokenInRoom(room, data.claimedTokenId)
    if (token?.name) return token.name
  }
  return 'Jugador'
}

export function registerRollRequestHandlers(io: Server, socket: Socket) {
  socket.on('rollRequest', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const data = socket.data as VttSocketData
    if (data.isDm) {
      socket.emit('rollRequestRejected', {
        message: 'Los directores no envían solicitudes de tirada.',
      })
      return
    }
    const playerSessionId = data.playerSessionId
    if (!playerSessionId) return
    if (!data.claimedTokenId) {
      socket.emit('rollRequestRejected', {
        message: 'Reclama un personaje para pedir permiso de tirada al director.',
      })
      return
    }
    const roomId = data.roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'rollRequest', 4)) return

    const dice = parseRollRequestDice(payload)
    if (!dice) {
      socket.emit('rollRequestRejected', {
        message: 'Esa combinación de dado y modo no es válida.',
      })
      return
    }

    let reason = ''
    if (typeof payload === 'object' && payload !== null) {
      const r = (payload as Record<string, unknown>).reason
      if (typeof r === 'string') reason = r.trim().slice(0, MAX_REASON)
    }
    if (!reason) {
      socket.emit('rollRequestRejected', {
        message: 'Escribe un motivo (p. ej. «¿Puedo tirar Percepción?»).',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    const queue = room.pendingRollRequests ?? []
    const same = queue.filter((q) => q.fromSessionId === playerSessionId).length
    if (same >= MAX_PENDING_PER_SESSION) {
      socket.emit('rollRequestRejected', {
        message: 'Ya tienes varias solicitudes pendientes. Espera respuesta del director.',
      })
      return
    }
    if (queue.length >= MAX_QUEUE_GLOBAL) {
      socket.emit('rollRequestRejected', {
        message: 'Hay demasiadas solicitudes en cola. Inténtalo en un momento.',
      })
      return
    }

    const entry: PendingRollRequest = {
      id: `rr-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      fromSessionId: playerSessionId,
      fromLabel: getPlayerLabel(room, data),
      dieType: dice.dieType,
      mode: dice.mode,
      reason,
      ts: Date.now(),
    }
    room.pendingRollRequests = [...queue, entry]
    broadcastRoomState(io, room)
  })

  socket.on('rollRequestResolve', (payload: unknown) => {
    const data = socket.data as VttSocketData
    if (!data.isDm) {
      socket.emit('dmError', {
        message: 'Solo el director puede aprobar o ignorar solicitudes de tirada.',
      })
      return
    }
    const roomId = data.roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'rollRequestResolve', 20)) return

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const requestId = typeof o.requestId === 'string' ? o.requestId : ''
    const action = o.action === 'approve' || o.action === 'dismiss' ? o.action : null
    if (!requestId || !action) return

    const room = getOrCreateRoom(roomId)
    const list = room.pendingRollRequests ?? []
    const removed = list.find((r) => r.id === requestId)
    if (!removed) return

    room.pendingRollRequests = list.filter((r) => r.id !== requestId)

    void emitToPlayerSession(io, roomId, removed.fromSessionId, 'rollRequestResolved', {
      requestId: removed.id,
      outcome: action === 'approve' ? 'approved' : 'dismissed',
      dieType: removed.dieType,
      mode: removed.mode,
      reason: removed.reason,
    })
    broadcastRoomState(io, room)
  })
}
