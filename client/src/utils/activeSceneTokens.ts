import type { RoomState, Token } from '../types/room'

/** Actualiza fichas en la escena activa y la vista plana `tokens`. */
export function mapTokensInActiveScene(
  prev: RoomState,
  mapFn: (tokens: Token[]) => Token[],
): RoomState {
  const aid = prev.activeSceneId
  const nextFlat = mapFn(prev.tokens)
  return {
    ...prev,
    tokens: nextFlat,
    scenes: prev.scenes.map((s) => (s.id === aid ? { ...s, tokens: nextFlat } : s)),
  }
}
