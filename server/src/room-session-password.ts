import type { RoomPoll, RoomState, Token } from './types.js'
import { hashSessionPassword, verifySessionPassword } from './session-password-crypto.js'

const hashes = new Map<string, string>()

/** Quién recibe el `roomState`: define si ve tiradas secretas en `diceLog`. */
export type PublicRoomViewer =
  | { role: 'dm' }
  | { role: 'spectator' }
  | { role: 'player'; playerSessionId?: string }

function filterDiceLogForViewer(
  diceLog: RoomState['diceLog'],
  viewer: PublicRoomViewer,
): RoomState['diceLog'] {
  return diceLog.filter((e) => {
    if (!e.secret) return true
    if (viewer.role === 'dm') return true
    if (viewer.role === 'spectator') return false
    const sid = viewer.playerSessionId
    if (sid && e.playerSessionId && e.playerSessionId === sid) return true
    return false
  })
}

function filterChatLogForViewer(
  chatLog: RoomState['chatLog'],
  viewer: PublicRoomViewer,
): RoomState['chatLog'] {
  return chatLog.filter((m) => {
    if (!m.whisper) return true
    if (viewer.role === 'dm') return true
    if (viewer.role === 'spectator') return false
    const sid = viewer.playerSessionId
    if (sid && (m.authorSessionId === sid || (m.mentions && m.mentions.includes(sid)))) {
      return true
    }
    return false
  })
}

export function hasSessionPassword(roomId: string): boolean {
  return hashes.has(roomId)
}

export function setSessionPasswordHash(roomId: string, plain: string): void {
  hashes.set(roomId, hashSessionPassword(plain))
}

export function clearSessionPassword(roomId: string): void {
  hashes.delete(roomId)
}

export function checkSessionPassword(roomId: string, plain: string): boolean {
  const stored = hashes.get(roomId)
  if (!stored) return true
  return verifySessionPassword(plain, stored)
}

function npcNameHiddenFromViewer(room: RoomState, viewer: PublicRoomViewer): boolean {
  if (!room.settings.hideNpcNamesFromPlayers) return false
  return viewer.role !== 'dm'
}

function mapTokenForViewer(t: Token, hideNpc: boolean) {
  const base = {
    ...t,
    ownerSocket: null as string | null,
  }
  if (hideNpc && t.type === 'npc') {
    return {
      ...base,
      name: `PNJ · ${t.id.slice(0, 4)}`,
    }
  }
  return base
}

/** Vista de votación enviada al cliente (myVote solo jugadores). */
export type PublicPoll = {
  id: string
  question: string
  options: string[]
  counts: number[]
  endsAt: number | null
  votes?: Record<string, number>
  myVote?: number
}

function mapActivePollForViewer(
  poll: RoomPoll | null | undefined,
  viewer: PublicRoomViewer,
): PublicPoll | null | undefined {
  if (!poll) return undefined
  const base = {
    id: poll.id,
    question: poll.question,
    options: poll.options,
    counts: [...poll.counts],
    endsAt: poll.endsAt,
  }
  if (viewer.role === 'dm') {
    return { ...base, votes: { ...poll.votes } }
  }
  if (viewer.role === 'player' && viewer.playerSessionId) {
    const mine = poll.votes[viewer.playerSessionId]
    return typeof mine === 'number' ? { ...base, myVote: mine } : { ...base }
  }
  return base
}

export function publicRoomState(
  room: RoomState,
  viewer: PublicRoomViewer = { role: 'spectator' },
): RoomState {
  const { privateNotesBySession: _notes, ...rest } = room
  const hideNpc = npcNameHiddenFromViewer(room, viewer)
  const activePoll = mapActivePollForViewer(room.activePoll ?? null, viewer)
  const pendingRollRequests = viewer.role === 'dm' ? [...(room.pendingRollRequests ?? [])] : []
  return {
    ...rest,
    activePoll: (activePoll ?? null) as RoomState['activePoll'],
    pendingRollRequests,
    diceLog: filterDiceLogForViewer(room.diceLog, viewer),
    chatLog: filterChatLogForViewer(room.chatLog, viewer),
    sessionPasswordConfigured: hasSessionPassword(room.roomId),
    scenes: room.scenes.map((sc) => ({
      ...sc,
      tokens: sc.tokens.map((t) => mapTokenForViewer(t, hideNpc)),
    })),
  } as RoomState
}

export function getSessionPasswordHashes(): Record<string, string> {
  return Object.fromEntries(hashes)
}

export function replaceSessionPasswordHashes(entries: Record<string, string>): void {
  hashes.clear()
  for (const [k, v] of Object.entries(entries)) {
    if (typeof k === 'string' && typeof v === 'string' && v.length > 0) {
      hashes.set(k, v)
    }
  }
}
