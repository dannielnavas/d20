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
  /** Socket conectado que controla el token en este momento (null si desconectado). */
  ownerSocket: string | null
  /** Id de sesión del jugador que reclamó este PC; persiste entre reconexiones. */
  claimedBy: string | null
}

export type RoomState = {
  roomId: string
  /** Solo informativo para la UI; no expone la contraseña. */
  sessionPasswordConfigured?: boolean
  initiative: {
    visible: boolean
    /** Orden de turnos por id de token (PC). */
    order: string[]
    /** Índice actual dentro de order; null si no hay turno activo. */
    currentIndex: number | null
  }
  settings: {
    backgroundUrl: string
    backgroundType: 'image' | 'video'
    mapAudioEnabled: boolean
    mapVolume: number
    gridSize: number
    snapToGrid: boolean
  }
  diceLog: {
    id: string
    roller: string
    dieType: DieType
    mode: DiceMode
    rolls: number[]
    total: number
    timestamp: number
  }[]
  tokens: Token[]
}

export function createEmptyRoom(roomId: string): RoomState {
  return {
    roomId,
    initiative: {
      visible: false,
      order: [],
      currentIndex: null,
    },
    settings: {
      backgroundUrl: '',
      backgroundType: 'image',
      mapAudioEnabled: false,
      mapVolume: 70,
      gridSize: 50,
      snapToGrid: true,
    },
    diceLog: [],
    tokens: [],
  }
}
