import { randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { snapToGrid } from './snap.js'
import {
  clearSessionPassword,
  publicRoomState,
  setSessionPasswordHash,
} from './room-session-password.js'
import { getOrCreateRoom } from './rooms.js'
import type { VttSocketData } from './socket-data.js'
import type { RoomState, Token } from './types.js'

function assertDm(socket: Socket): boolean {
  const d = socket.data as VttSocketData
  if (!d.isDm) {
    socket.emit('dmError', { message: 'Solo el DM puede usar esta acción' })
    return false
  }
  return true
}

function syncInitiative(room: RoomState) {
  const pcIds = room.tokens.filter((t) => t.type === 'pc').map((t) => t.id)
  const pcSet = new Set(pcIds)
  const filtered = room.initiative.order.filter((id) => pcSet.has(id))
  const missing = pcIds.filter((id) => !filtered.includes(id))
  room.initiative.order = [...filtered, ...missing]
  if (room.initiative.order.length === 0) {
    room.initiative.currentIndex = null
    return
  }
  const idx = room.initiative.currentIndex
  if (idx === null || idx < 0 || idx >= room.initiative.order.length) {
    room.initiative.currentIndex = 0
  }
}

function parseUpdateSettings(payload: unknown): Partial<RoomState['settings']> | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  const out: Partial<RoomState['settings']> = {}

  if (typeof o.backgroundUrl === 'string') out.backgroundUrl = o.backgroundUrl
  if (o.backgroundType === 'image' || o.backgroundType === 'video')
    out.backgroundType = o.backgroundType
  if (typeof o.gridSize === 'number' && Number.isFinite(o.gridSize))
    out.gridSize = o.gridSize
  if (typeof o.mapAudioEnabled === 'boolean') out.mapAudioEnabled = o.mapAudioEnabled
  if (typeof o.mapVolume === 'number' && Number.isFinite(o.mapVolume))
    out.mapVolume = o.mapVolume
  if (typeof o.snapToGrid === 'boolean') out.snapToGrid = o.snapToGrid

  return Object.keys(out).length > 0 ? out : null
}

type SpawnParsed = {
  x: number
  y: number
  name: string
  img: string
  size: number
  count: number
}

function randomPortrait(): string {
  return `https://picsum.photos/seed/${randomUUID().slice(0, 8)}/96/96`
}

function parseSpawnPayload(
  payload: unknown,
  opts: { defaultName: string; allowCount: boolean },
): SpawnParsed | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>

  const x = typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 800
  const y = typeof o.y === 'number' && Number.isFinite(o.y) ? o.y : 450
  const rawName =
    typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 80) : opts.defaultName
  const img =
    typeof o.img === 'string' && o.img.trim()
      ? o.img.trim().slice(0, 2000)
      : randomPortrait()
  const size =
    typeof o.size === 'number' && Number.isFinite(o.size)
      ? Math.min(200, Math.max(24, Math.round(o.size)))
      : 48

  let count = 1
  if (opts.allowCount && typeof o.count === 'number' && Number.isFinite(o.count)) {
    count = Math.min(12, Math.max(1, Math.round(o.count)))
  }

  return { x, y, name: rawName, img, size, count }
}

function placeTokenXY(
  room: RoomState,
  baseX: number,
  baseY: number,
  slotIndex: number,
): { x: number; y: number } {
  const step = Math.max(24, Math.min(120, room.settings.gridSize || 50))
  const x = baseX + (slotIndex % 6) * step
  const y = baseY + Math.floor(slotIndex / 6) * step
  if (!room.settings.snapToGrid) return { x, y }
  return snapToGrid(x, y, room.settings.gridSize)
}

export function registerDmHandlers(io: Server, socket: Socket) {
  socket.on('updateRoomSettings', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const partial = parseUpdateSettings(payload)
    if (!partial) {
      socket.emit('dmError', { message: 'No hay campos válidos para actualizar' })
      return
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    if (typeof partial.backgroundUrl === 'string') {
      room.settings.backgroundUrl = partial.backgroundUrl
    }
    if (partial.backgroundType !== undefined) {
      room.settings.backgroundType = partial.backgroundType
    }
    if (typeof partial.gridSize === 'number') {
      room.settings.gridSize = Math.min(200, Math.max(8, Math.round(partial.gridSize)))
    }
    if (typeof partial.mapAudioEnabled === 'boolean') {
      room.settings.mapAudioEnabled = partial.mapAudioEnabled
    }
    if (typeof partial.mapVolume === 'number') {
      room.settings.mapVolume = Math.min(100, Math.max(0, Math.round(partial.mapVolume)))
    }
    if (typeof partial.snapToGrid === 'boolean') {
      room.settings.snapToGrid = partial.snapToGrid
    }

    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('initiativeToggleVisibility', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.visible !== 'boolean') return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    room.initiative.visible = o.visible
    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('initiativeMove', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.tokenId !== 'string') return
    const direction = o.direction
    if (direction !== 'up' && direction !== 'down') return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const index = room.initiative.order.indexOf(o.tokenId)
    if (index === -1) return

    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= room.initiative.order.length) return

    const currentTokenId =
      room.initiative.currentIndex !== null
        ? room.initiative.order[room.initiative.currentIndex]
        : null

    const tmp = room.initiative.order[index]
    room.initiative.order[index] = room.initiative.order[target]
    room.initiative.order[target] = tmp

    if (currentTokenId) {
      room.initiative.currentIndex = room.initiative.order.indexOf(currentTokenId)
    }

    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('initiativeNext', () => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    if (room.initiative.order.length === 0) return
    const nextIndex =
      room.initiative.currentIndex === null
        ? 0
        : (room.initiative.currentIndex + 1) % room.initiative.order.length
    room.initiative.currentIndex = nextIndex
    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('initiativeSetCurrent', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.tokenId !== 'string') return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const index = room.initiative.order.indexOf(o.tokenId)
    if (index === -1) return
    room.initiative.currentIndex = index
    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('setSessionPassword', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    if (typeof payload !== 'object' || payload === null) {
      socket.emit('dmError', { message: 'Payload inválido' })
      return
    }
    const o = payload as Record<string, unknown>
    const password = typeof o.password === 'string' ? o.password : ''
    const trimmed = password.trim()

    if (trimmed.length === 0) {
      clearSessionPassword(roomId)
    } else {
      if (trimmed.length < 4) {
        socket.emit('dmError', {
          message: 'La contraseña debe tener al menos 4 caracteres',
        })
        return
      }
      if (trimmed.length > 128) {
        socket.emit('dmError', { message: 'La contraseña no puede superar 128 caracteres' })
        return
      }
      setSessionPasswordHash(roomId, trimmed)
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('spawnNpc', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseSpawnPayload(payload, { defaultName: 'PNJ', allowCount: false })
    if (!parsed) {
      socket.emit('dmError', { message: 'Payload de PNJ inválido' })
      return
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const slot = room.tokens.length
    const { x, y } = placeTokenXY(room, parsed.x, parsed.y, slot)

    const token: Token = {
      id: `npc-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      name: parsed.name,
      img: parsed.img,
      x,
      y,
      size: parsed.size,
      type: 'npc',
      ownerSocket: null,
      claimedBy: null,
    }

    room.tokens.push(token)
    io.to(roomId).emit('roomState', publicRoomState(room))
  })

  socket.on('spawnPc', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseSpawnPayload(payload, { defaultName: 'Héroe', allowCount: true })
    if (!parsed) {
      socket.emit('dmError', { message: 'Payload de personaje inválido' })
      return
    }

    const raw = payload as Record<string, unknown>
    const explicitImg =
      typeof raw.img === 'string' && raw.img.trim()
        ? raw.img.trim().slice(0, 2000)
        : null

    const room = getOrCreateRoom(roomId)
    const baseName = parsed.name.trim() || 'Héroe'
    const baseSlot = room.tokens.length

    for (let i = 0; i < parsed.count; i++) {
      const displayName =
        parsed.count > 1 ? `${baseName} ${i + 1}`.trim() : baseName
      const slot = baseSlot + i
      const { x, y } = placeTokenXY(room, parsed.x, parsed.y, slot)

      let img: string
      if (explicitImg) {
        img = explicitImg
      } else if (parsed.count === 1) {
        img = parsed.img
      } else {
        img = randomPortrait()
      }

      const token: Token = {
        id: `pc-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        name: displayName.slice(0, 80),
        img,
        x,
        y,
        size: parsed.size,
        type: 'pc',
        ownerSocket: null,
        claimedBy: null,
      }
      room.tokens.push(token)
    }

    io.to(roomId).emit('roomState', publicRoomState(room))
  })
}
