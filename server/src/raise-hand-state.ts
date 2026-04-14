import { findTokenInRoom } from './scene-helpers.js'
import type { RoomState } from './types.js'

/** Quita la mano levantada del jugador que controla ese token (p. ej. al pasar el turno). */
export function clearRaisedHandForToken(room: RoomState, tokenId: string): void {
  const tok = findTokenInRoom(room, tokenId)
  if (!tok?.claimedBy) return
  const sid = tok.claimedBy
  const hands = room.raisedHands ?? []
  if (!hands.includes(sid)) return
  room.raisedHands = hands.filter((s) => s !== sid)
}
