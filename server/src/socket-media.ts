import type { Server, Socket } from 'socket.io'
import { isMediaPeerInRoom, mediaPeerJoin, mediaPeerLeave } from './media-room.js'
import type { VttSocketData } from './socket-data.js'

export type WebrtcSignalPayload =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: Record<string, unknown> }

function parseWebrtcPayload(raw: unknown): WebrtcSignalPayload | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const type = o.type
  if (type === 'offer' || type === 'answer') {
    if (typeof o.sdp !== 'string') return null
    return { type, sdp: o.sdp }
  }
  if (type === 'ice') {
    if (typeof o.candidate !== 'object' || o.candidate === null) return null
    return { type: 'ice', candidate: o.candidate as Record<string, unknown> }
  }
  return null
}

function assertSameRoom(from: Socket, to: Socket): boolean {
  const a = (from.data as VttSocketData).roomId
  const b = (to.data as VttSocketData).roomId
  return Boolean(a && a === b)
}

export function clearMediaPeer(socket: Socket) {
  const data = socket.data as VttSocketData
  const roomId = data.roomId
  if (!roomId) return
  if (!isMediaPeerInRoom(roomId, socket.id)) return
  mediaPeerLeave(roomId, socket.id)
  socket.to(roomId).emit('mediaPeerLeft', { peerId: socket.id })
}

export function registerMediaHandlers(io: Server, socket: Socket) {
  socket.on('mediaJoin', (payload: unknown) => {
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) {
      socket.emit('mediaError', {
        message: 'Entra primero a la mesa; después podrás encender cámara o micrófono.',
      })
      return
    }

    let displayName = 'Participante'
    let avatarUrl: string | null = null
    if (typeof payload === 'object' && payload !== null) {
      const o = payload as Record<string, unknown>
      if (typeof o.displayName === 'string' && o.displayName.trim()) {
        displayName = o.displayName.trim().slice(0, 48)
      }
      if (typeof o.avatarUrl === 'string' && o.avatarUrl.trim()) {
        avatarUrl = o.avatarUrl.trim().slice(0, 2000)
      }
    }

    const { others } = mediaPeerJoin(roomId, socket.id, displayName, avatarUrl)

    socket.emit('mediaPeersSnapshot', { peers: others })
    socket.to(roomId).emit('mediaPeerJoined', {
      peerId: socket.id,
      displayName: displayName.trim().slice(0, 48) || 'Participante',
      avatarUrl,
    })
  })

  socket.on('mediaLeave', () => {
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) return
    if (!isMediaPeerInRoom(roomId, socket.id)) return
    mediaPeerLeave(roomId, socket.id)
    socket.to(roomId).emit('mediaPeerLeft', { peerId: socket.id })
  })

  socket.on('webrtcSignal', (raw: unknown) => {
    const data = socket.data as VttSocketData
    const roomId = data.roomId
    if (!roomId) return

    if (typeof raw !== 'object' || raw === null) return
    const o = raw as Record<string, unknown>
    const targetId = typeof o.targetId === 'string' ? o.targetId : ''
    const payload = parseWebrtcPayload(o.payload)
    if (!targetId || !payload) return

    const target = io.sockets.sockets.get(targetId)
    if (!target || !assertSameRoom(socket, target)) return
    if (!isMediaPeerInRoom(roomId, socket.id) || !isMediaPeerInRoom(roomId, targetId)) return

    target.emit('webrtcSignal', { fromId: socket.id, payload })
  })
}
