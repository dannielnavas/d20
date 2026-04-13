import type { RoomState } from './types.js'
import { hashSessionPassword, verifySessionPassword } from './session-password-crypto.js'

const hashes = new Map<string, string>()

export function hasSessionPassword(roomId: string): boolean {
  return hashes.has(roomId)
}

export function setSessionPasswordHash(roomId: string, plain: string): void {
  hashes.set(roomId, hashSessionPassword(plain))
}

export function clearSessionPassword(roomId: string): void {
  hashes.delete(roomId)
}

export function checkSessionPassword(roomId: string, plain: string): boolean {
  const stored = hashes.get(roomId)
  if (!stored) return true
  return verifySessionPassword(plain, stored)
}

export function publicRoomState(room: RoomState): RoomState {
  return {
    ...room,
    sessionPasswordConfigured: hasSessionPassword(room.roomId),
  }
}
