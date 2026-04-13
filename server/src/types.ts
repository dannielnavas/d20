export type TokenType = 'pc' | 'npc'

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
  settings: {
    backgroundUrl: string
    backgroundType: 'image' | 'video'
    mapAudioEnabled: boolean
    mapVolume: number
    gridSize: number
    snapToGrid: boolean
  }
  tokens: Token[]
}

export function createEmptyRoom(roomId: string): RoomState {
  return {
    roomId,
    settings: {
      backgroundUrl: '',
      backgroundType: 'image',
      mapAudioEnabled: false,
      mapVolume: 70,
      gridSize: 50,
      snapToGrid: true,
    },
    tokens: [],
  }
}
