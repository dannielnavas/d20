import { randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { appendActivity } from './activity-log.js'
import { broadcastRoomState } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'
import type { RoomPoll, RoomState } from './types.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

const MAX_Q = 280
const MAX_OPT = 120
const MIN_TIMEOUT_S = 10
const MAX_TIMEOUT_S = 3600

const pollTimers = new Map<string, ReturnType<typeof setTimeout>>()

function assertDm(socket: Socket): boolean {
  const d = socket.data as VttSocketData
  if (!d.isDm) {
    socket.emit('dmError', { message: 'Solo el director de juego puede gestionar votaciones.' })
    return false
  }
  return true
}

function clearPollTimer(roomId: string) {
  const t = pollTimers.get(roomId)
  if (t) {
    clearTimeout(t)
    pollTimers.delete(roomId)
  }
}

function schedulePollEnd(io: Server, room: RoomState, pollId: string, endsAt: number) {
  const roomId = room.roomId
  clearPollTimer(roomId)
  const ms = Math.max(0, endsAt - Date.now())
  const timer = setTimeout(() => {
    pollTimers.delete(roomId)
    const r = getOrCreateRoom(roomId)
    if (!r.activePoll || r.activePoll.id !== pollId) return
    r.activePoll = null
    appendActivity(r, 'system', 'Votación cerrada (tiempo agotado).')
    broadcastRoomState(io, r)
  }, ms)
  pollTimers.set(roomId, timer)
}

function parseOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') return null
    const t = x.trim().slice(0, MAX_OPT)
    if (t) out.push(t)
    if (out.length >= 4) break
  }
  if (out.length < 2 || out.length > 4) return null
  return out
}

export function registerPollHandlers(io: Server, socket: Socket) {
  socket.on('pollStart', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'pollStart', 2)) return

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const question = typeof o.question === 'string' ? o.question.trim().slice(0, MAX_Q) : ''
    if (!question) return

    const options = parseOptions(o.options)
    if (!options) {
      socket.emit('dmError', {
        message: 'La votación necesita entre 2 y 4 opciones con texto.',
      })
      return
    }

    let timeoutSeconds: number | null = null
    if (o.timeoutSeconds !== undefined && o.timeoutSeconds !== null) {
      const n = typeof o.timeoutSeconds === 'number' ? o.timeoutSeconds : Number(o.timeoutSeconds)
      if (!Number.isFinite(n) || n < 0) return
      if (n === 0) timeoutSeconds = null
      else {
        timeoutSeconds = Math.min(MAX_TIMEOUT_S, Math.max(MIN_TIMEOUT_S, Math.round(n)))
      }
    }

    const room = getOrCreateRoom(roomId)
    clearPollTimer(roomId)

    const id = `poll-${randomUUID().replace(/-/g, '').slice(0, 12)}`
    const counts = options.map(() => 0)
    const poll: RoomPoll = {
      id,
      question,
      options,
      counts,
      votes: {},
      endsAt: timeoutSeconds !== null ? Date.now() + timeoutSeconds * 1000 : null,
    }
    room.activePoll = poll
    appendActivity(room, 'system', `Votación: ${question}`)
    broadcastRoomState(io, room)

    if (poll.endsAt !== null) {
      schedulePollEnd(io, room, poll.id, poll.endsAt)
    }
  })

  socket.on('pollVote', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return
    if (data.isDm) return
    const sid = data.playerSessionId
    if (!sid) return

    if (!allowSocketEvent(socket.id, 'pollVote', 8)) return

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const idx =
      typeof o.optionIndex === 'number'
        ? o.optionIndex
        : typeof o.optionIndex === 'string'
          ? Number.parseInt(o.optionIndex, 10)
          : NaN
    if (!Number.isInteger(idx)) return

    const room = getOrCreateRoom(roomId)
    const poll = room.activePoll
    if (!poll) return
    if (poll.votes[sid] !== undefined) return
    if (idx < 0 || idx >= poll.options.length) return

    poll.votes[sid] = idx
    poll.counts[idx] = (poll.counts[idx] ?? 0) + 1
    broadcastRoomState(io, room)
  })

  socket.on('pollEnd', () => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (!allowSocketEvent(socket.id, 'pollEnd', 4)) return

    const room = getOrCreateRoom(roomId)
    if (!room.activePoll) return

    const q = room.activePoll.question
    clearPollTimer(roomId)
    room.activePoll = null
    appendActivity(
      room,
      'system',
      `Votación cerrada: «${q.slice(0, 80)}${q.length > 80 ? '…' : ''}».`,
    )
    broadcastRoomState(io, room)
  })
}
