import type { RoomState, Token } from '../types/room'

/** Todos los PJ de la mesa (único por id; pueden estar en varias escenas). */
export function allPlayerCharacters(state: RoomState): Token[] {
  const byId = new Map<string, Token>()
  for (const sc of state.scenes) {
    for (const t of sc.tokens) {
      if (t.type === 'pc' && !byId.has(t.id)) byId.set(t.id, t)
    }
  }
  return Array.from(byId.values())
}

export function findTokenInRoomState(state: RoomState, tokenId: string): Token | undefined {
  for (const sc of state.scenes) {
    const t = sc.tokens.find((x) => x.id === tokenId)
    if (t) return t
  }
  return state.tokens.find((t) => t.id === tokenId)
}
