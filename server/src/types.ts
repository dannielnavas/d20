import { randomUUID } from 'crypto'

export type TokenType = 'pc' | 'npc'
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'
export type DiceMode = 'normal' | 'advantage' | 'disadvantage'

export type Token = {
  id: string
  name: string
  img: string
  x: number
  y: number
  size: number
  type: TokenType
  ownerSocket: string | null
  claimedBy: string | null
  /** Etiquetas de estado (ej. envenenado); máx. 6 en servidor */
  conditions?: string[]
  /**
   * Solo PNJ: `false` = en reserva (no se muestra en el mapa hasta activar).
   * Ausente o `true` = visible en mapa (compatibilidad con datos antiguos).
   */
  onMap?: boolean
}

export type ChatMessage = {
  id: string
  author: string
  text: string
  ts: number
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

/** Notas solo visibles para el DM y el jugador con esa `playerSessionId`. No va en `roomState` público. */
export type PrivateNotesEntry = {
  /** Texto del director al jugador. */
  dm: string
  /** Texto del jugador al director. */
  player: string
}

/** Ajustes de mapa por escena (fondo, cuadrícula, audio del vídeo). */
export type SceneMapSettings = {
  backgroundUrl: string
  backgroundType: 'image' | 'video'
  mapAudioEnabled: boolean
  mapVolume: number
  gridSize: number
  snapToGrid: boolean
}

export type Scene = {
  id: string
  name: string
  settings: SceneMapSettings
  tokens: Token[]
}

/** Ajustes de toda la mesa (no dependen del mapa activo). */
export type RoomGlobalSettings = {
  playersCanPing: boolean
  showTokenNames: boolean
  hideNpcNamesFromPlayers: boolean
  /** Si los jugadores pueden enviar revelación de imagen por URL (el DM siempre puede). */
  playersCanRevealImage: boolean
}

export type RoomState = {
  roomId: string
  roomVersion: number
  sessionPasswordConfigured?: boolean
  initiative: {
    visible: boolean
    order: string[]
    currentIndex: number | null
    /** Modificador de iniciativa por id de token (PC). */
    modifiers: Record<string, number>
  }
  settings: RoomGlobalSettings
  /** Escenas: cada una con fondo, cuadrícula y fichas propias. */
  scenes: Scene[]
  activeSceneId: string
  chatLog: ChatMessage[]
  /** Historial unificado de eventos para la UI. */
  activityLog: ActivityEntry[]
  diceLog: {
    id: string
    roller: string
    dieType: DieType
    mode: DiceMode
    rolls: number[]
    total: number
    timestamp: number
    /** Solo el DM (y opcionalmente el jugador que tiró) ven la tirada en mesa. */
    secret?: boolean
    /** Si el tirador fue un jugador en modo oculto, para filtrar su `roomState`. */
    playerSessionId?: string
  }[]
  /** Por id de sesión de jugador; no se envía en broadcast de sala. */
  privateNotesBySession?: Record<string, PrivateNotesEntry>
  /**
   * Votación grupal en curso (no se persiste en disco).
   * `votes`: sesión de jugador → índice de opción (solo servidor; el cliente recibe vista filtrada).
   */
  activePoll?: RoomPoll | null
  /** Solo DM: cola de solicitudes de tirada (no persiste). */
  pendingRollRequests?: PendingRollRequest[]
  /** Manos levantadas: ids de sesión de jugador (no persiste). */
  raisedHands?: string[]
}

export type PendingRollRequest = {
  id: string
  fromSessionId: string
  fromLabel: string
  dieType: DieType
  mode: DiceMode
  reason: string
  ts: number
}

/** Estado interno de votación (mismo objeto que se muta en memoria). */
export type RoomPoll = {
  id: string
  question: string
  /** 2…4 textos de opción */
  options: string[]
  /** Paralelo a `options` */
  counts: number[]
  votes: Record<string, number>
  /** Cierre automático; `null` = solo manual */
  endsAt: number | null
}

export function createEmptyRoom(roomId: string): RoomState {
  const sceneId = `scn-${randomUUID().replace(/-/g, '').slice(0, 12)}`
  return {
    roomId,
    roomVersion: 0,
    chatLog: [],
    activityLog: [],
    initiative: {
      visible: false,
      order: [],
      currentIndex: null,
      modifiers: {},
    },
    settings: {
      playersCanPing: true,
      showTokenNames: true,
      hideNpcNamesFromPlayers: false,
      playersCanRevealImage: false,
    },
    scenes: [
      {
        id: sceneId,
        name: 'Escena 1',
        settings: {
          backgroundUrl: '',
          backgroundType: 'image',
          mapAudioEnabled: false,
          mapVolume: 70,
          gridSize: 50,
          snapToGrid: true,
        },
        tokens: [],
      },
    ],
    activeSceneId: sceneId,
    diceLog: [],
    privateNotesBySession: {},
    activePoll: null,
    pendingRollRequests: [],
    raisedHands: [],
  }
}
