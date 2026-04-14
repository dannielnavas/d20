import type { Server } from 'socket.io'
import { publicRoomState, type PublicRoomViewer } from './room-session-password.js'
import { schedulePersist } from './persistence.js'
import type { VttSocketData } from './socket-data.js'
import type { RoomState } from './types.js'

function viewerFromSocketData(data: VttSocketData): PublicRoomViewer {
  if (data.isDm) return { role: 'dm' }
  if (data.isSpectator) return { role: 'spectator' }
  return { role: 'player', playerSessionId: data.playerSessionId }
}

/**
 * Emite estado completo a la sala e incrementa versión (mutaciones).
 * Cada cliente recibe `diceLog` filtrado según rol (tiradas secretas solo DM / tirador).
 */
async function broadcastRoomStateAsync(io: Server, room: RoomState): Promise<void> {
  room.roomVersion = (room.roomVersion ?? 0) + 1
  const sockets = await io.in(room.roomId).fetchSockets()
  for (const s of sockets) {
    const d = s.data as VttSocketData
    s.emit('roomState', publicRoomState(room, viewerFromSocketData(d)))
  }
  schedulePersist()
}

/** API síncrona: dispara el broadcast sin bloquear al caller. */
export function broadcastRoomState(io: Server, room: RoomState): void {
  void broadcastRoomStateAsync(io, room)
}

/** Emite un evento solo al socket del jugador con esa sesión en la sala. */
export async function emitToPlayerSession(
  io: Server,
  roomId: string,
  playerSessionId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const sockets = await io.in(roomId).fetchSockets()
  for (const s of sockets) {
    const d = s.data as VttSocketData
    if (!d.isDm && !d.isSpectator && d.playerSessionId === playerSessionId) {
      s.emit(event, payload)
      return
    }
  }
}

/** Emite animación/FX de dados; las tiradas secretas solo llegan al DM y al socket que tiró. */
export async function emitDiceRolled(
  io: Server,
  roomId: string,
  entry: RoomState['diceLog'][number],
  rollerSocketId: string | null,
): Promise<void> {
  if (!entry.secret) {
    io.to(roomId).emit('diceRolled', entry)
    return
  }
  const sockets = await io.in(roomId).fetchSockets()
  for (const s of sockets) {
    const d = s.data as VttSocketData
    if (d.isDm || (rollerSocketId !== null && s.id === rollerSocketId)) {
      s.emit('diceRolled', entry)
    }
  }
}
