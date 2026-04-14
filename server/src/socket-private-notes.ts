import type { Server, Socket } from 'socket.io'
import { schedulePersist } from './persistence.js'
import { allowSocketEvent } from './rate-limit.js'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'
import { assertNotSpectator } from './socket-guards.js'
import type { PrivateNotesEntry, RoomState } from './types.js'

const MAX_NOTE_LEN = 6000
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/

function emptyEntry(): PrivateNotesEntry {
  return { dm: '', player: '' }
}

function ensurePrivateNotes(room: RoomState): Record<string, PrivateNotesEntry> {
  if (!room.privateNotesBySession || typeof room.privateNotesBySession !== 'object') {
    room.privateNotesBySession = {}
  }
  return room.privateNotesBySession
}

/** Tras unirse a la sala: estado inicial solo para este socket. */
export function emitPrivateNotesInitial(socket: Socket, room: RoomState): void {
  const data = socket.data as VttSocketData
  if (data.isSpectator) return
  if (data.isDm) {
    socket.emit('privateNotesDmSnapshot', ensurePrivateNotes(room))
    return
  }
  if (data.playerSessionId) {
    const map = ensurePrivateNotes(room)
    const entry = map[data.playerSessionId] ?? emptyEntry()
    socket.emit('privateNotesSync', entry)
  }
}

async function pushPrivateNotesToRoom(
  io: Server,
  roomId: string,
  sessionId: string,
  entry: PrivateNotesEntry,
): Promise<void> {
  const sockets = await io.in(roomId).fetchSockets()
  for (const s of sockets) {
    const d = s.data as VttSocketData
    if (d.isDm) {
      s.emit('privateNotesDmUpdate', {
        playerSessionId: sessionId,
        dm: entry.dm,
        player: entry.player,
      })
    } else if (d.playerSessionId === sessionId && !d.isSpectator) {
      s.emit('privateNotesSync', { dm: entry.dm, player: entry.player })
    }
  }
}

export function registerPrivateNotesHandlers(io: Server, socket: Socket) {
  socket.on('privateNotesSet', async (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'privateNotesSet', 10)) {
      socket.emit('roomError', {
        message: 'Vas muy rápido. Espera un momento antes de guardar más notas.',
      })
      return
    }

    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const trimField = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_NOTE_LEN) : undefined)

    const room = getOrCreateRoom(roomId)
    const map = ensurePrivateNotes(room)

    if (data.isDm) {
      const sidRaw = typeof o.playerSessionId === 'string' ? o.playerSessionId.trim() : ''
      if (!SESSION_ID_RE.test(sidRaw)) {
        socket.emit('dmError', {
          message: 'Identificador de jugador no válido para las notas privadas.',
        })
        return
      }
      if (o.dm === undefined) return
      const dmText = trimField(o.dm) ?? ''
      const cur = map[sidRaw] ?? emptyEntry()
      map[sidRaw] = { ...cur, dm: dmText }
      schedulePersist()
      await pushPrivateNotesToRoom(io, roomId, sidRaw, map[sidRaw])
      return
    }

    const sid = data.playerSessionId
    if (!sid) return
    if (o.player === undefined) return
    const playerText = trimField(o.player) ?? ''
    const cur = map[sid] ?? emptyEntry()
    map[sid] = { ...cur, player: playerText }
    schedulePersist()
    await pushPrivateNotesToRoom(io, roomId, sid, map[sid])
  })
}
