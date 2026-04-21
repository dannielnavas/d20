type MediaPeerInfo = { displayName: string; avatarUrl: string | null; frameColor: string | null }

/** Participantes con AV activo por sala (socketId → metadatos). */
const roomMediaPeers = new Map<string, Map<string, MediaPeerInfo>>()

function getMap(roomId: string): Map<string, MediaPeerInfo> {
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
  avatarUrl?: string | null,
  frameColor?: string | null,
): {
  others: {
    peerId: string
    displayName: string
    avatarUrl: string | null
    frameColor: string | null
  }[]
} {
  const m = getMap(roomId)
  const trimmed = displayName.trim().slice(0, 48) || 'Participante'
  const avatar =
    typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
      ? avatarUrl.trim().slice(0, 2000)
      : null
  const color =
    typeof frameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(frameColor.trim())
      ? frameColor.trim().toLowerCase()
      : null
  m.set(socketId, { displayName: trimmed, avatarUrl: avatar, frameColor: color })
  const others: {
    peerId: string
    displayName: string
    avatarUrl: string | null
    frameColor: string | null
  }[] = []
  for (const [id, info] of m) {
    if (id !== socketId) {
      others.push({
        peerId: id,
        displayName: info.displayName,
        avatarUrl: info.avatarUrl,
        frameColor: info.frameColor,
      })
    }
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
