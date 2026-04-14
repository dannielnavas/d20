import { randomUUID } from 'crypto'
import type { RoomState, Scene, SceneMapSettings, Token } from './types.js'

export function getActiveScene(room: RoomState): Scene {
  const s = room.scenes.find((x) => x.id === room.activeSceneId)
  if (s) return s
  return room.scenes[0]
}

export function allRoomTokens(room: RoomState): Token[] {
  return room.scenes.flatMap((sc) => sc.tokens)
}

export function findTokenInRoom(room: RoomState, tokenId: string): Token | undefined {
  for (const sc of room.scenes) {
    const t = sc.tokens.find((x) => x.id === tokenId)
    if (t) return t
  }
  return undefined
}

export function defaultSceneMapSettings(): SceneMapSettings {
  return {
    backgroundUrl: '',
    backgroundType: 'image',
    mapAudioEnabled: false,
    mapVolume: 70,
    gridSize: 50,
    snapToGrid: true,
  }
}

/** Migra salas antiguas (tokens + settings en la raíz) al modelo por escenas. */
export function migrateRoomToScenes(room: RoomState): void {
  if (Array.isArray(room.scenes) && room.scenes.length > 0) {
    if (typeof room.activeSceneId !== 'string' || !room.activeSceneId) {
      room.activeSceneId = room.scenes[0].id
    } else if (!room.scenes.some((s) => s.id === room.activeSceneId)) {
      room.activeSceneId = room.scenes[0].id
    }
    const legacy = room as unknown as { tokens?: Token[] }
    if (Array.isArray(legacy.tokens)) delete legacy.tokens
    return
  }

  const legacy = room as unknown as {
    tokens?: Token[]
    settings?: Record<string, unknown>
  }
  const legacyTokens = Array.isArray(legacy.tokens) ? legacy.tokens : []
  const ls = legacy.settings ?? {}

  const mapSettings: SceneMapSettings = {
    backgroundUrl: typeof ls.backgroundUrl === 'string' ? ls.backgroundUrl : '',
    backgroundType: ls.backgroundType === 'video' ? 'video' : 'image',
    mapAudioEnabled: Boolean(ls.mapAudioEnabled),
    mapVolume: typeof ls.mapVolume === 'number' && Number.isFinite(ls.mapVolume) ? ls.mapVolume : 70,
    gridSize: typeof ls.gridSize === 'number' && Number.isFinite(ls.gridSize) ? ls.gridSize : 50,
    snapToGrid: ls.snapToGrid !== false,
  }

  room.settings = {
    playersCanPing: ls.playersCanPing !== false,
    showTokenNames: ls.showTokenNames !== false,
    hideNpcNamesFromPlayers: Boolean(ls.hideNpcNamesFromPlayers),
    playersCanRevealImage: ls.playersCanRevealImage === true,
  }

  const id = randomUUID()
  room.scenes = [
    {
      id,
      name: 'Escena 1',
      settings: mapSettings,
      tokens: legacyTokens,
    },
  ]
  room.activeSceneId = id
  delete legacy.tokens
}
