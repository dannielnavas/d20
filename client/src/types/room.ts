export type TokenType = 'pc' | 'npc'

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
  settings: {
    backgroundUrl: string
    backgroundType: 'image' | 'video'
    gridSize: number
    snapToGrid: boolean
  }
  tokens: Token[]
}
