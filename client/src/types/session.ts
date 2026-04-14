export type SessionState = {
  role: 'dm' | 'player' | 'spectator'
  claimedTokenId: string | null
}
