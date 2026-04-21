export type TokenType = 'pc' | 'npc'
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'
export type DiceMode = 'normal' | 'advantage' | 'disadvantage'

export type Token = {
  id: string
  name: string
  img: string
  frameColor?: string
  x: number
  y: number
  size: number
  type: TokenType
  ownerSocket: string | null
  claimedBy: string | null
  hitPointsCurrent?: number
  hitPointsMax?: number
  hitPointsTemp?: number
  /** Etiquetas de estado (ej. envenenado); máx. 6 en servidor */
  conditions?: string[]
  /** Solo PNJ: false = reserva, no visible en mapa. */
  onMap?: boolean
}

export type ChatMessage = {
  id: string
  author: string
  authorSessionId?: string
  text: string
  ts: number
  whisper?: boolean
  /** Destinatarios: ids de sesión de jugador o `__dm__` para el director. */
  mentions?: string[]
}

export type ActivityKind = 'dice' | 'chat' | 'claim' | 'initiative' | 'system' | 'scene'

export type ActivityEntry = {
  id: string
  ts: number
  kind: ActivityKind
  text: string
}

/** Mapa: fondo, cuadrícula y audio del vídeo de mapa. */
export type SceneMapSettings = {
  backgroundUrl: string
  backgroundType: 'image' | 'video'
  mapAudioEnabled: boolean
  mapVolume: number
  gridSize: number
  snapToGrid: boolean
}

export type RoomGlobalSettings = {
  playersCanPing: boolean
  showTokenNames: boolean
  hideNpcNamesFromPlayers: boolean
  /** Jugadores pueden mostrar imagen por URL (el DM siempre puede). */
  playersCanRevealImage: boolean
}

export type Scene = {
  id: string
  name: string
  settings: SceneMapSettings
  tokens: Token[]
}

/** Respuesta del DM a una solicitud de tirada (evento `rollRequestResolved`). */
export type RollRequestFeedback = {
  requestId: string
  outcome: 'approved' | 'dismissed'
  dieType?: DieType
  mode?: DiceMode
  reason?: string
}

/** Solicitud de permiso de tirada (solo el DM recibe la cola en `roomState`). */
export type PendingRollRequest = {
  id: string
  fromSessionId: string
  fromLabel: string
  dieType: DieType
  mode: DiceMode
  reason: string
  ts: number
}

/** Votación grupal (vista del cliente; `votes` solo DM, `myVote` solo tu sesión). */
export type RoomActivePoll = {
  id: string
  question: string
  options: string[]
  counts: number[]
  endsAt: number | null
  votes?: Record<string, number>
  myVote?: number
}

/**
 * Vista combinada para componentes existentes: ajustes globales + mapa de la escena activa.
 * `scenes` y `activeSceneId` son la fuente de verdad en servidor.
 */
export type RoomState = {
  roomId: string
  roomVersion: number
  sessionPasswordConfigured?: boolean
  initiative: {
    visible: boolean
    order: string[]
    currentIndex: number | null
    modifiers: Record<string, number>
  }
  settings: RoomGlobalSettings & SceneMapSettings
  scenes: Scene[]
  activeSceneId: string
  chatLog: ChatMessage[]
  activityLog: ActivityEntry[]
  diceLog: {
    id: string
    roller: string
    dieType: DieType
    mode: DiceMode
    rolls: number[]
    total: number
    timestamp: number
    secret?: boolean
    playerSessionId?: string
  }[]
  /** Fichas de la escena activa (denormalizado para el mapa). */
  tokens: Token[]
  activePoll?: RoomActivePoll | null
  /** Solo DM: cola de «¿puedo tirar…?». */
  pendingRollRequests?: PendingRollRequest[]
  /** Manos levantadas: ids de sesión de jugador. */
  raisedHands?: string[]
}
