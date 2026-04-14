import type {
  ChatMessage,
  PendingRollRequest,
  RoomActivePoll,
  RoomGlobalSettings,
  RoomState,
  Scene,
  SceneMapSettings,
} from '../../types/room'
import type { SessionState } from '../../types/session'

export type TokenPosEvent = { tokenId: string; x: number; y: number }

function defaultGlobalSettings(): RoomGlobalSettings {
  return {
    playersCanPing: true,
    showTokenNames: true,
    hideNpcNamesFromPlayers: false,
    playersCanRevealImage: false,
  }
}

function defaultSceneMapSettings(): SceneMapSettings {
  return {
    backgroundUrl: '',
    backgroundType: 'image',
    mapAudioEnabled: false,
    mapVolume: 70,
    gridSize: 50,
    snapToGrid: true,
  }
}

/** Extrae solo ajustes globales de un objeto mezclado (compat. datos antiguos). */
function parseGlobalFromSettings(
  s: Partial<RoomState['settings']> | undefined,
): RoomGlobalSettings {
  if (!s) return defaultGlobalSettings()
  return {
    playersCanPing: s.playersCanPing !== false,
    showTokenNames: s.showTokenNames !== false,
    hideNpcNamesFromPlayers: Boolean(s.hideNpcNamesFromPlayers),
    playersCanRevealImage: s.playersCanRevealImage === true,
  }
}

function parseMapFromFlatSettings(s: Partial<RoomState['settings']> | undefined): SceneMapSettings {
  if (!s) return defaultSceneMapSettings()
  return {
    backgroundUrl: typeof s.backgroundUrl === 'string' ? s.backgroundUrl : '',
    backgroundType: s.backgroundType === 'video' ? 'video' : 'image',
    mapAudioEnabled: Boolean(s.mapAudioEnabled),
    mapVolume: typeof s.mapVolume === 'number' && Number.isFinite(s.mapVolume) ? s.mapVolume : 70,
    gridSize: typeof s.gridSize === 'number' && Number.isFinite(s.gridSize) ? s.gridSize : 50,
    snapToGrid: s.snapToGrid !== false,
  }
}

function normalizeActivePoll(raw: unknown): RoomActivePoll | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.question !== 'string' || !Array.isArray(o.options)) {
    return null
  }
  const options = o.options.filter((x): x is string => typeof x === 'string')
  if (options.length < 2) return null
  const countsRaw = Array.isArray(o.counts) ? o.counts : []
  const counts = options.map((_, i) => {
    const c = countsRaw[i]
    return typeof c === 'number' && Number.isFinite(c) ? Math.max(0, Math.round(c)) : 0
  })
  const endsAt = typeof o.endsAt === 'number' && Number.isFinite(o.endsAt) ? o.endsAt : null
  const out: RoomActivePoll = {
    id: o.id,
    question: o.question,
    options,
    counts,
    endsAt,
  }
  if (typeof o.myVote === 'number' && Number.isInteger(o.myVote)) {
    out.myVote = o.myVote
  }
  if (o.votes && typeof o.votes === 'object' && o.votes !== null) {
    const votes: Record<string, number> = {}
    for (const [k, v] of Object.entries(o.votes as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isInteger(v)) votes[k] = v
    }
    if (Object.keys(votes).length > 0) out.votes = votes
  }
  return out
}

const DIE_TYPES = new Set(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'])
const DICE_MODES = new Set(['normal', 'advantage', 'disadvantage'])

function normalizePendingRollRequests(raw: unknown): PendingRollRequest[] {
  if (!Array.isArray(raw)) return []
  const out: PendingRollRequest[] = []
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue
    const o = row as Record<string, unknown>
    if (
      typeof o.id !== 'string' ||
      typeof o.fromSessionId !== 'string' ||
      typeof o.fromLabel !== 'string' ||
      typeof o.reason !== 'string' ||
      typeof o.ts !== 'number' ||
      typeof o.dieType !== 'string' ||
      typeof o.mode !== 'string'
    ) {
      continue
    }
    if (!DIE_TYPES.has(o.dieType) || !DICE_MODES.has(o.mode)) continue
    out.push({
      id: o.id,
      fromSessionId: o.fromSessionId,
      fromLabel: o.fromLabel,
      dieType: o.dieType as PendingRollRequest['dieType'],
      mode: o.mode as PendingRollRequest['mode'],
      reason: o.reason,
      ts: o.ts,
    })
  }
  return out
}

function normalizeRaisedHands(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

function normalizeChatMessage(raw: unknown): ChatMessage | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Record<string, unknown>
  const mentions = Array.isArray(e.mentions)
    ? e.mentions.filter((x): x is string => typeof x === 'string')
    : undefined
  return {
    id: typeof e.id === 'string' ? e.id : '',
    author: typeof e.author === 'string' ? e.author : '',
    text: typeof e.text === 'string' ? e.text : '',
    ts: typeof e.ts === 'number' ? e.ts : 0,
    ...(mentions && mentions.length > 0 ? { mentions } : {}),
  }
}

export function parseSessionState(payload: unknown): SessionState | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (o.role !== 'dm' && o.role !== 'player' && o.role !== 'spectator') return null
  let claimedTokenId: string | null = null
  if (typeof o.claimedTokenId === 'string' && o.claimedTokenId.length > 0) {
    claimedTokenId = o.claimedTokenId
  }
  return {
    role: o.role,
    claimedTokenId,
  }
}

export function parseDiceLogEntry(payload: unknown): RoomState['diceLog'][number] | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as unknown as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.roller !== 'string' ||
    typeof o.dieType !== 'string' ||
    typeof o.mode !== 'string' ||
    !Array.isArray(o.rolls) ||
    typeof o.total !== 'number' ||
    typeof o.timestamp !== 'number'
  ) {
    return null
  }
  return o as RoomState['diceLog'][number]
}

export function normalizeRoomState(payload: RoomState): RoomState {
  const ini = payload.initiative
  const initiative = ini
    ? {
        visible: Boolean(ini.visible),
        order: Array.isArray(ini.order) ? ini.order : [],
        currentIndex:
          typeof ini.currentIndex === 'number' || ini.currentIndex === null
            ? ini.currentIndex
            : null,
        modifiers: ini.modifiers && typeof ini.modifiers === 'object' ? ini.modifiers : {},
      }
    : {
        visible: false,
        order: [] as string[],
        currentIndex: null as number | null,
        modifiers: {} as Record<string, number>,
      }

  let scenes: Scene[] = Array.isArray(payload.scenes) ? payload.scenes : []
  let activeSceneId =
    typeof payload.activeSceneId === 'string' && payload.activeSceneId ? payload.activeSceneId : ''

  if (scenes.length === 0 && Array.isArray(payload.tokens)) {
    const id = `scn-local-${payload.roomId || 'r'}`
    scenes = [
      {
        id,
        name: 'Escena 1',
        settings: parseMapFromFlatSettings(payload.settings),
        tokens: payload.tokens,
      },
    ]
    activeSceneId = id
  }

  if (scenes.length === 0) {
    const id = `scn-${payload.roomId || 'empty'}`
    scenes = [{ id, name: 'Escena 1', settings: defaultSceneMapSettings(), tokens: [] }]
    activeSceneId = id
  }

  for (const sc of scenes) {
    if (!sc.settings) sc.settings = defaultSceneMapSettings()
    if (!Array.isArray(sc.tokens)) sc.tokens = []
  }

  const active =
    scenes.find((s) => s.id === activeSceneId) ?? (scenes.length > 0 ? scenes[0] : null)

  const globalFromPayload = parseGlobalFromSettings(payload.settings)
  const mapFromActive = active
    ? { ...defaultSceneMapSettings(), ...active.settings }
    : defaultSceneMapSettings()

  const mergedSettings: RoomState['settings'] = {
    ...globalFromPayload,
    ...mapFromActive,
  }

  const tokens = active?.tokens ?? []

  const chatLogRaw = Array.isArray(payload.chatLog) ? payload.chatLog : []
  const chatLog: ChatMessage[] = []
  for (const row of chatLogRaw) {
    const m = normalizeChatMessage(row)
    if (m) chatLog.push(m)
  }

  const merged = {
    ...payload,
    roomVersion:
      typeof payload.roomVersion === 'number' && Number.isFinite(payload.roomVersion)
        ? payload.roomVersion
        : 0,
    settings: mergedSettings,
    initiative,
    chatLog,
    activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
    diceLog: Array.isArray(payload.diceLog) ? payload.diceLog : [],
    scenes,
    activeSceneId: active?.id ?? activeSceneId,
    tokens,
    activePoll: normalizeActivePoll((payload as Record<string, unknown>).activePoll),
    pendingRollRequests: normalizePendingRollRequests(
      (payload as Record<string, unknown>).pendingRollRequests,
    ),
    raisedHands: normalizeRaisedHands((payload as Record<string, unknown>).raisedHands),
  } as RoomState & Record<string, unknown>

  delete merged.fogReveals
  delete merged.measurement
  delete merged.mapAnnotations
  delete merged.sceneSlots
  delete (merged.settings as unknown as { fogOfWar?: unknown }).fogOfWar
  return merged as RoomState
}
