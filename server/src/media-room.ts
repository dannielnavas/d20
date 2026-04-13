/** Participantes con av activo por sala (socketId → nombre mostrado). */
const roomMediaPeers = new Map<string, Map<string, string>>()

function getMap(roomId: string): Map<string, string> {
  let m = roomMediaPeers.get(roomId)
  if (!m) {
    m = new Map()
    roomMediaPeers.set(roomId, m)
  }
  return m
}

export function mediaPeerJoin(
  roomId: string,
  socketId: string,
  displayName: string,
): { others: { peerId: string; displayName: string }[] } {
  const m = getMap(roomId)
  const trimmed = displayName.trim().slice(0, 48) || 'Participante'
  m.set(socketId, trimmed)
  const others: { peerId: string; displayName: string }[] = []
  for (const [id, name] of m) {
    if (id !== socketId) others.push({ peerId: id, displayName: name })
  }
  return { others }
}

export function mediaPeerLeave(roomId: string, socketId: string): void {
  const m = roomMediaPeers.get(roomId)
  if (!m) return
  m.delete(socketId)
  if (m.size === 0) roomMediaPeers.delete(roomId)
}

export function isMediaPeerInRoom(roomId: string, socketId: string): boolean {
  return roomMediaPeers.get(roomId)?.has(socketId) ?? false
}
