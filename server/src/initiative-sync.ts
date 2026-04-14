import { allRoomTokens } from './scene-helpers.js'
import type { RoomState } from './types.js'

export function syncInitiative(room: RoomState) {
  const pcIds = allRoomTokens(room)
    .filter((t) => t.type === 'pc')
    .map((t) => t.id)
  const pcSet = new Set(pcIds)
  const filtered = room.initiative.order.filter((id) => pcSet.has(id))
  const missing = pcIds.filter((id) => !filtered.includes(id))
  room.initiative.order = [...filtered, ...missing]
  for (const id of Object.keys(room.initiative.modifiers)) {
    if (!pcSet.has(id)) delete room.initiative.modifiers[id]
  }
  if (room.initiative.order.length === 0) {
    room.initiative.currentIndex = null
    return
  }
  const idx = room.initiative.currentIndex
  if (idx === null || idx < 0 || idx >= room.initiative.order.length) {
    room.initiative.currentIndex = 0
  }
}
