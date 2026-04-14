import { randomInt, randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { appendActivity } from './activity-log.js'
import { broadcastRoomState, emitDiceRolled } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'
import type { DiceMode, DieType, RoomState } from './types.js'

const DIE_TYPES: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const D20_MODES: DiceMode[] = ['normal', 'advantage', 'disadvantage']
const DICE_LOG_LIMIT = 20

type DiceRollPayload = {
  dieType: DieType
  mode: DiceMode
  secret: boolean
}

function parseDicePayload(payload: unknown): DiceRollPayload | null {
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

  const secret = o.secret === true

  return { dieType, mode: modeRaw, secret }
}

function rollValue(sides: number): number {
  return randomInt(1, sides + 1)
}

function rollDice(dieType: DieType, mode: DiceMode): { rolls: number[]; total: number } {
  const sides = Number(dieType.slice(1))
  if (dieType !== 'd20' || mode === 'normal') {
    const value = rollValue(sides)
    return { rolls: [value], total: value }
  }

  const first = rollValue(20)
  const second = rollValue(20)
  const total = mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
  return { rolls: [first, second], total }
}

function getRollerName(room: RoomState, data: VttSocketData): string {
  if (data.isDm) return 'Dungeon Master'
  if (data.claimedTokenId) {
    const token = findTokenInRoom(room, data.claimedTokenId)
    if (token?.name) return token.name
  }
  return 'Jugador'
}

export function registerDiceHandlers(io: Server, socket: Socket) {
  socket.on('diceRoll', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) return

    const parsed = parseDicePayload(payload)
    if (!parsed) {
      socket.emit('roomError', {
        message: 'Esa combinación de dado y modo no es válida. Prueba con otra opción.',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    const result = rollDice(parsed.dieType, parsed.mode)
    const roller = getRollerName(room, data)

    const entry: RoomState['diceLog'][number] = {
      id: `roll-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      roller,
      dieType: parsed.dieType,
      mode: parsed.mode,
      rolls: result.rolls,
      total: result.total,
      timestamp: Date.now(),
    }

    if (parsed.secret) {
      entry.secret = true
      if (!data.isDm && data.playerSessionId) {
        entry.playerSessionId = data.playerSessionId
      }
    }

    room.diceLog.unshift(entry)
    if (room.diceLog.length > DICE_LOG_LIMIT) {
      room.diceLog = room.diceLog.slice(0, DICE_LOG_LIMIT)
    }

    if (!parsed.secret) {
      appendActivity(
        room,
        'dice',
        `${roller}: ${parsed.dieType} → ${result.total}${parsed.mode !== 'normal' ? ` (${parsed.mode})` : ''}`,
      )
    }

    void emitDiceRolled(io, roomId, entry, socket.id).then(() => {
      broadcastRoomState(io, room)
    })
  })

  socket.on('diceLogReset', () => {
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) return
    if (!data.isDm) {
      socket.emit('dmError', {
        message: 'Solo el director de juego puede vaciar el historial de tiradas.',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    room.diceLog = []
    broadcastRoomState(io, room)
  })
}
