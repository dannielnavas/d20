import { createEmptyRoom, type RoomState, type Token } from './types.js'
import { getActiveScene, migrateRoomToScenes } from './scene-helpers.js'

const rooms = new Map<string, RoomState>()
const DEFAULT_TOKEN_FRAME_COLOR = '#b48a3c'

function normalizeTokenShape(token: Token): void {
  if (!Array.isArray(token.conditions)) token.conditions = []
  if (typeof token.frameColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(token.frameColor)) {
    token.frameColor = DEFAULT_TOKEN_FRAME_COLOR
  } else {
    token.frameColor = token.frameColor.toLowerCase()
  }
  if (typeof token.hitPointsMax !== 'number' || !Number.isFinite(token.hitPointsMax)) {
    token.hitPointsMax = 0
  }
  if (typeof token.hitPointsCurrent !== 'number' || !Number.isFinite(token.hitPointsCurrent)) {
    token.hitPointsCurrent = token.hitPointsMax
  }
  if (typeof token.hitPointsTemp !== 'number' || !Number.isFinite(token.hitPointsTemp)) {
    token.hitPointsTemp = 0
  }
  token.hitPointsMax = Math.max(0, Math.round(token.hitPointsMax))
  token.hitPointsCurrent = Math.max(0, Math.min(Math.round(token.hitPointsCurrent), token.hitPointsMax))
  token.hitPointsTemp = Math.max(0, Math.round(token.hitPointsTemp))
}

function ensureRoomShape(room: RoomState): void {
  if (!Array.isArray(room.chatLog)) room.chatLog = []
  if (!Array.isArray(room.activityLog)) room.activityLog = []
  if (typeof room.roomVersion !== 'number' || !Number.isFinite(room.roomVersion)) {
    room.roomVersion = 0
  }
  if (!room.initiative) {
    room.initiative = { visible: false, order: [], currentIndex: null, modifiers: {} }
  }
  if (!room.initiative.modifiers || typeof room.initiative.modifiers !== 'object') {
    room.initiative.modifiers = {}
  }
  if (!room.settings) {
    room.settings = {
      playersCanPing: true,
      showTokenNames: true,
      hideNpcNamesFromPlayers: false,
      playersCanRevealImage: false,
    }
  } else {
    if (typeof room.settings.playersCanPing !== 'boolean') room.settings.playersCanPing = true
    if (typeof room.settings.showTokenNames !== 'boolean') room.settings.showTokenNames = true
    if (typeof room.settings.hideNpcNamesFromPlayers !== 'boolean')
      room.settings.hideNpcNamesFromPlayers = false
    if (typeof room.settings.playersCanRevealImage !== 'boolean')
      room.settings.playersCanRevealImage = false
  }
  migrateRoomToScenes(room)
  const legacy = room as unknown as Record<string, unknown>
  delete legacy.fogReveals
  delete legacy.measurement
  delete legacy.mapAnnotations
  delete legacy.sceneSlots
  delete (room.settings as unknown as { fogOfWar?: unknown }).fogOfWar
  for (const sc of room.scenes) {
    for (const t of sc.tokens) {
      normalizeTokenShape(t)
    }
  }
  if (!room.privateNotesBySession || typeof room.privateNotesBySession !== 'object') {
    room.privateNotesBySession = {}
  }
  if (room.activePoll === undefined) room.activePoll = null
  if (!Array.isArray(room.pendingRollRequests)) room.pendingRollRequests = []
  if (!Array.isArray(room.raisedHands)) room.raisedHands = []
}

function demoTokens(): Token[] {
  return []
}

function ensureDemoSeed(room: RoomState) {
  const active = getActiveScene(room)
  if (room.roomId === 'demo' && active.tokens.length === 0) {
    active.tokens.push(...demoTokens())
  }
}

export function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId)
  if (!room) {
    room = createEmptyRoom(roomId)
    rooms.set(roomId, room)
  }
  ensureRoomShape(room)
  ensureDemoSeed(room)
  return room
}

export function getAllRooms(): Map<string, RoomState> {
  return rooms
}

export function replaceAllRooms(next: Map<string, RoomState>): void {
  rooms.clear()
  for (const [k, v] of next) {
    ensureRoomShape(v)
    rooms.set(k, v)
  }
}
