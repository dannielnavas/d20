import { randomUUID } from 'crypto'
import type { RoomState } from './types.js'

export type ActivityKind = 'dice' | 'chat' | 'claim' | 'initiative' | 'system' | 'scene'

const MAX_ENTRIES = 120

export function appendActivity(room: RoomState, kind: ActivityKind, text: string): void {
  const t = text.trim().slice(0, 600)
  if (!t) return
  room.activityLog.unshift({
    id: `act-${randomUUID().replace(/-/g, '').slice(0, 14)}`,
    ts: Date.now(),
    kind,
    text: t,
  })
  if (room.activityLog.length > MAX_ENTRIES) {
    room.activityLog = room.activityLog.slice(0, MAX_ENTRIES)
  }
}
