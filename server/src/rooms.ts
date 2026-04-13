import { createEmptyRoom, type RoomState, type Token } from './types.js'

const rooms = new Map<string, RoomState>()

function demoTokens(): Token[] {
  return [

  ]
}

function ensureDemoSeed(room: RoomState) {
  if (room.roomId === 'demo' && room.tokens.length === 0) {
    room.tokens.push(...demoTokens())
  }
}

export function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId)
  if (!room) {
    room = createEmptyRoom(roomId)
    rooms.set(roomId, room)
  }
  ensureDemoSeed(room)
  return room
}
