import { randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { appendActivity } from './activity-log.js'
import { getMentionTargetsFromRoom, parseMentionsInText } from './chat-mentions.js'
import { broadcastRoomState } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom } from './scene-helpers.js'
import type { VttSocketData } from './socket-data.js'
import type { RoomState } from './types.js'
import { allowSocketEvent } from './rate-limit.js'
import { assertNotSpectator } from './socket-guards.js'

const MAX_CHAT = 50
const MAX_TEXT = 500
const MAX_MENTIONS = 8

function authorName(room: RoomState, data: VttSocketData): string {
  if (data.isDm) return 'DM'
  if (data.claimedTokenId) {
    const t = data.claimedTokenId ? findTokenInRoom(room, data.claimedTokenId) : undefined
    return t?.name ?? 'Jugador'
  }
  return 'Jugador'
}

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chatMessage', (payload: unknown) => {
    if (!assertNotSpectator(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    const data = socket.data as VttSocketData
    if (!roomId) return

    if (!allowSocketEvent(socket.id, 'chatMessage', 12)) {
      socket.emit('roomError', {
        message: 'Vas muy rápido. Espera unos segundos antes de enviar más mensajes.',
      })
      return
    }

    if (typeof payload !== 'object' || payload === null) return
    const text =
      typeof (payload as Record<string, unknown>).text === 'string'
        ? ((payload as Record<string, unknown>).text as string)
        : ''
    const trimmed = text.trim().slice(0, MAX_TEXT)
    if (!trimmed) return

    const room = getOrCreateRoom(roomId)
    const targets = getMentionTargetsFromRoom(room)
    const mentions = parseMentionsInText(trimmed, targets).slice(0, MAX_MENTIONS)

    let finalMsgText = trimmed
    let isWhisper = false
    if (finalMsgText.toLowerCase().startsWith('/w ')) {
      isWhisper = true
      finalMsgText = finalMsgText.slice(3).trim()
    }

    const entry: RoomState['chatLog'][number] = {
      id: `chat-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      author: authorName(room, data),
      authorSessionId: data.playerSessionId ?? undefined,
      text: finalMsgText,
      ts: Date.now(),
      whisper: isWhisper ? true : undefined,
      ...(mentions.length > 0 ? { mentions } : {}),
    }
    room.chatLog.unshift(entry)
    if (room.chatLog.length > MAX_CHAT) {
      room.chatLog = room.chatLog.slice(0, MAX_CHAT)
    }
    appendActivity(room, 'chat', `${entry.author}: ${entry.text}`)
    broadcastRoomState(io, room)
  })
}
