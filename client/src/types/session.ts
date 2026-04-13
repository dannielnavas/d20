export type SessionState = {
  role: 'dm' | 'player'
  claimedTokenId: string | null
}
