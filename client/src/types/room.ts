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
}

export type RoomState = {
  roomId: string
  /** Indica si el DM configuró contraseña de sesión (el hash solo vive en el servidor). */
  sessionPasswordConfigured?: boolean
  initiative: {
    visible: boolean
    order: string[]
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
