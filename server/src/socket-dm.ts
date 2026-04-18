import { randomInt, randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'
import { snapToGrid } from './snap.js'
import { appendActivity } from './activity-log.js'
import { clearRaisedHandForToken } from './raise-hand-state.js'
import { syncInitiative } from './initiative-sync.js'
import { broadcastRoomState } from './room-broadcast.js'
import { clearSessionPassword, setSessionPasswordHash } from './room-session-password.js'
import { getOrCreateRoom } from './rooms.js'
import { assertDm } from './socket-dm-assert.js'
import type { VttSocketData } from './socket-data.js'
import { allRoomTokens, findTokenInRoom, getActiveScene } from './scene-helpers.js'
import type { RoomState, Token } from './types.js'

type SettingsPatch = Partial<
  import('./types.js').SceneMapSettings & import('./types.js').RoomGlobalSettings
>

function parseUpdateSettings(payload: unknown): SettingsPatch | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  const out: SettingsPatch = {}

  if (typeof o.backgroundUrl === 'string') out.backgroundUrl = o.backgroundUrl
  if (o.backgroundType === 'image' || o.backgroundType === 'video')
    out.backgroundType = o.backgroundType
  if (typeof o.gridSize === 'number' && Number.isFinite(o.gridSize)) out.gridSize = o.gridSize
  if (typeof o.mapAudioEnabled === 'boolean') out.mapAudioEnabled = o.mapAudioEnabled
  if (typeof o.mapVolume === 'number' && Number.isFinite(o.mapVolume)) out.mapVolume = o.mapVolume
  if (typeof o.snapToGrid === 'boolean') out.snapToGrid = o.snapToGrid
  if (typeof o.playersCanPing === 'boolean') out.playersCanPing = o.playersCanPing
  if (typeof o.showTokenNames === 'boolean') out.showTokenNames = o.showTokenNames
  if (typeof o.hideNpcNamesFromPlayers === 'boolean')
    out.hideNpcNamesFromPlayers = o.hideNpcNamesFromPlayers
  if (typeof o.playersCanRevealImage === 'boolean')
    out.playersCanRevealImage = o.playersCanRevealImage

  return Object.keys(out).length > 0 ? out : null
}

type SpawnParsed = {
  x: number
  y: number
  name: string
  img: string
  size: number
  count: number
  /** Solo PNJ: crear en reserva sin colocar en el mapa. */
  reserveOnly: boolean
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
    typeof o.img === 'string' && o.img.trim() ? o.img.trim().slice(0, 2000) : randomPortrait()
  const size =
    typeof o.size === 'number' && Number.isFinite(o.size)
      ? Math.min(200, Math.max(24, Math.round(o.size)))
      : 48

  let count = 1
  if (opts.allowCount && typeof o.count === 'number' && Number.isFinite(o.count)) {
    count = Math.min(12, Math.max(1, Math.round(o.count)))
  }

  const reserveOnly = o.reserveOnly === true

  return { x, y, name: rawName, img, size, count, reserveOnly }
}

function placeTokenXY(
  room: RoomState,
  baseX: number,
  baseY: number,
  slotIndex: number,
): { x: number; y: number } {
  const ms = getActiveScene(room).settings
  const step = Math.max(24, Math.min(120, ms.gridSize || 50))
  const x = baseX + (slotIndex % 6) * step
  const y = baseY + Math.floor(slotIndex / 6) * step
  if (!ms.snapToGrid) return { x, y }
  return snapToGrid(x, y, ms.gridSize)
}

export function registerDmHandlers(io: Server, socket: Socket) {
  socket.on('updateRoomSettings', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const partial = parseUpdateSettings(payload)
    if (!partial) {
      socket.emit('dmError', {
        message:
          'No hay cambios que guardar. Ajusta mapa, cuadrícula u otra opción e inténtalo de nuevo.',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const active = getActiveScene(room)
    if (typeof partial.backgroundUrl === 'string') {
      active.settings.backgroundUrl = partial.backgroundUrl
    }
    if (partial.backgroundType !== undefined) {
      active.settings.backgroundType = partial.backgroundType
    }
    if (typeof partial.gridSize === 'number') {
      active.settings.gridSize = Math.min(200, Math.max(8, Math.round(partial.gridSize)))
    }
    if (typeof partial.mapAudioEnabled === 'boolean') {
      active.settings.mapAudioEnabled = partial.mapAudioEnabled
    }
    if (typeof partial.mapVolume === 'number') {
      active.settings.mapVolume = Math.min(100, Math.max(0, Math.round(partial.mapVolume)))
    }
    if (typeof partial.snapToGrid === 'boolean') {
      active.settings.snapToGrid = partial.snapToGrid
    }
    if (typeof partial.playersCanPing === 'boolean') {
      room.settings.playersCanPing = partial.playersCanPing
    }
    if (typeof partial.showTokenNames === 'boolean') {
      room.settings.showTokenNames = partial.showTokenNames
    }
    if (typeof partial.hideNpcNamesFromPlayers === 'boolean') {
      room.settings.hideNpcNamesFromPlayers = partial.hideNpcNamesFromPlayers
    }
    if (typeof partial.playersCanRevealImage === 'boolean') {
      room.settings.playersCanRevealImage = partial.playersCanRevealImage
    }

    broadcastRoomState(io, room)
  })

  socket.on('initiativeSetModifier', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    if (typeof o.tokenId !== 'string') return
    const mod =
      typeof o.modifier === 'number' && Number.isFinite(o.modifier)
        ? Math.min(99, Math.max(-99, Math.round(o.modifier)))
        : 0

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const tok = findTokenInRoom(room, o.tokenId)
    if (!tok || tok.type !== 'pc') return
    if (mod === 0) delete room.initiative.modifiers[o.tokenId]
    else room.initiative.modifiers[o.tokenId] = mod
    broadcastRoomState(io, room)
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
    broadcastRoomState(io, room)
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

    broadcastRoomState(io, room)
  })

  socket.on('initiativeRollAll', () => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const pcs = allRoomTokens(room).filter((t) => t.type === 'pc')
    if (pcs.length === 0) return

    const scored = pcs.map((t) => {
      const mod = room.initiative.modifiers[t.id] ?? 0
      const roll = randomInt(1, 21)
      return { t, roll, mod, total: roll + mod }
    })
    scored.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return a.t.name.localeCompare(b.t.name, 'es')
    })
    room.initiative.order = scored.map((s) => s.t.id)
    room.initiative.currentIndex = 0
    room.initiative.visible = true
    const summary = scored
      .map(
        (s) =>
          `${s.t.name}: ${s.roll}${s.mod ? (s.mod > 0 ? `+${s.mod}` : `${s.mod}`) : ''}=${s.total}`,
      )
      .join(' · ')
    appendActivity(room, 'initiative', `Iniciativa — ${summary}`)
    broadcastRoomState(io, room)
  })

  socket.on('initiativeNext', () => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const order = room.initiative.order
    if (order.length === 0) return
    const prevIndex = room.initiative.currentIndex
    const prevTokenId =
      prevIndex !== null && prevIndex >= 0 && prevIndex < order.length ? order[prevIndex] : null
    const nextIndex = prevIndex === null ? 0 : (prevIndex + 1) % order.length
    room.initiative.currentIndex = nextIndex
    if (prevTokenId) clearRaisedHandForToken(room, prevTokenId)
    const curId =
      room.initiative.currentIndex !== null
        ? room.initiative.order[room.initiative.currentIndex]
        : null
    const name = curId ? (findTokenInRoom(room, curId)?.name ?? curId) : '?'
    appendActivity(room, 'initiative', `Turno: ${name}`)
    broadcastRoomState(io, room)
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
    const order = room.initiative.order
    const oldIndex = room.initiative.currentIndex
    const oldTokenId =
      oldIndex !== null && oldIndex >= 0 && oldIndex < order.length ? order[oldIndex] : null
    const index = order.indexOf(o.tokenId)
    if (index === -1) return
    if (oldTokenId !== null && oldTokenId !== o.tokenId) {
      clearRaisedHandForToken(room, oldTokenId)
    }
    room.initiative.currentIndex = index
    broadcastRoomState(io, room)
  })

  socket.on('setSessionPassword', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    if (typeof payload !== 'object' || payload === null) {
      socket.emit('dmError', {
        message:
          'No recibimos bien los datos de la contraseña. Cierra el panel y vuelve a intentarlo.',
      })
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
          message: 'La contraseña de la mesa debe tener al menos 4 caracteres.',
        })
        return
      }
      if (trimmed.length > 128) {
        socket.emit('dmError', {
          message: 'Esa contraseña es demasiado larga (como máximo 128 caracteres).',
        })
        return
      }
      setSessionPasswordHash(roomId, trimmed)
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    broadcastRoomState(io, room)
  })

  socket.on('spawnNpc', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseSpawnPayload(payload, { defaultName: 'PNJ', allowCount: false })
    if (!parsed) {
      socket.emit('dmError', {
        message: 'No pudimos crear el PNJ. Revisa nombre o imagen e inténtalo de nuevo.',
      })
      return
    }

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)

    if (parsed.reserveOnly) {
      const token: Token = {
        id: `npc-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        name: parsed.name,
        img: parsed.img,
        x: 0,
        y: 0,
        size: parsed.size,
        type: 'npc',
        ownerSocket: null,
        claimedBy: null,
        conditions: [],
        onMap: false,
      }
      getActiveScene(room).tokens.push(token)
      broadcastRoomState(io, room)
      return
    }

    const slot = getActiveScene(room).tokens.filter(
      (t) => t.type !== 'npc' || t.onMap !== false,
    ).length
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
      conditions: [],
    }

    getActiveScene(room).tokens.push(token)
    broadcastRoomState(io, room)
  })

  socket.on('npcSetOnMap', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const o = payload as Record<string, unknown>
    const tokenIdRaw = o.tokenId
    if (typeof tokenIdRaw !== 'string' || !tokenIdRaw.trim()) return
    if (typeof o.onMap !== 'boolean') return
    const tokenId = tokenIdRaw.trim()

    const room = getOrCreateRoom(roomId)
    syncInitiative(room)
    const token = findTokenInRoom(room, tokenId)
    if (!token || token.type !== 'npc') {
      socket.emit('dmError', {
        message: 'No encontramos ese PNJ. Recarga el elenco e inténtalo de nuevo.',
      })
      return
    }

    if (o.onMap) {
      const baseX = typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 800
      const baseY = typeof o.y === 'number' && Number.isFinite(o.y) ? o.y : 450
      const otherVisible = getActiveScene(room).tokens.filter(
        (t) => t.id !== token.id && (t.type !== 'npc' || t.onMap !== false),
      ).length
      const { x, y } = placeTokenXY(room, baseX, baseY, otherVisible)
      token.x = x
      token.y = y
      token.onMap = true
    } else {
      token.onMap = false
      token.x = 0
      token.y = 0
    }

    broadcastRoomState(io, room)
  })

  socket.on('spawnPc', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const parsed = parseSpawnPayload(payload, { defaultName: 'Héroe', allowCount: true })
    if (!parsed) {
      socket.emit('dmError', {
        message: 'No pudimos añadir los personajes. Revisa cantidad, nombre o imagen.',
      })
      return
    }

    const raw = payload as Record<string, unknown>
    const explicitImg =
      typeof raw.img === 'string' && raw.img.trim() ? raw.img.trim().slice(0, 2000) : null

    const room = getOrCreateRoom(roomId)
    const baseName = parsed.name.trim() || 'Héroe'
    const baseSlot = getActiveScene(room).tokens.filter(
      (t) => t.type !== 'npc' || t.onMap !== false,
    ).length

    for (let i = 0; i < parsed.count; i++) {
      const displayName = parsed.count > 1 ? `${baseName} ${i + 1}`.trim() : baseName
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
        conditions: [],
      }
      getActiveScene(room).tokens.push(token)
    }

    broadcastRoomState(io, room)
  })

  socket.on('setActiveScene', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const p = payload as Record<string, unknown>
    const sceneIdRaw = p.sceneId
    const sceneId = typeof sceneIdRaw === 'string' ? sceneIdRaw.trim() : ''
    if (!sceneId) return

    const room = getOrCreateRoom(roomId)
    if (!room.scenes.some((s) => s.id === sceneId)) return

    const oldScene = getActiveScene(room)
    const newScene = room.scenes.find((s) => s.id === sceneId)!
    
    if (oldScene.id !== newScene.id) {
      const pcs = oldScene.tokens.filter((t) => t.type === 'pc')
      for (const pc of pcs) {
        if (!newScene.tokens.some((nt) => nt.id === pc.id)) {
          newScene.tokens.push({ ...pc })
        }
      }
    }

    room.activeSceneId = sceneId
    syncInitiative(room)
    appendActivity(room, 'scene', `Escena activa: ${getActiveScene(room).name}`)
    broadcastRoomState(io, room)
  })

  socket.on('addScene', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return

    const room = getOrCreateRoom(roomId)
    const o = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    const name =
      typeof o.name === 'string' && o.name.trim()
        ? o.name.trim().slice(0, 80)
        : `Escena ${room.scenes.length + 1}`
    const copyFrom =
      typeof o.copyFromSceneId === 'string' && o.copyFromSceneId.trim()
        ? o.copyFromSceneId.trim()
        : room.activeSceneId
    const template = room.scenes.find((s) => s.id === copyFrom) ?? getActiveScene(room)
    const id = `scn-${randomUUID().replace(/-/g, '').slice(0, 12)}`
    room.scenes.push({
      id,
      name,
      settings: { ...template.settings },
      tokens: [],
    })
    if (o.activate !== false) room.activeSceneId = id
    syncInitiative(room)
    appendActivity(room, 'scene', `Nueva escena: ${name}`)
    broadcastRoomState(io, room)
  })

  socket.on('deleteScene', (payload: unknown) => {
    if (!assertDm(socket)) return
    const roomId = (socket.data as VttSocketData).roomId
    if (!roomId) return
    if (typeof payload !== 'object' || payload === null) return
    const pd = payload as Record<string, unknown>
    const delSceneRaw = pd.sceneId
    const sceneId = typeof delSceneRaw === 'string' ? delSceneRaw.trim() : ''
    if (!sceneId) return

    const room = getOrCreateRoom(roomId)
    if (room.scenes.length <= 1) {
      socket.emit('dmError', { message: 'Debe quedar al menos una escena.' })
      return
    }
    const idx = room.scenes.findIndex((s) => s.id === sceneId)
    if (idx === -1) return
    if (room.scenes[idx].tokens.length > 0) {
      socket.emit('dmError', {
        message: 'Vacía la escena (sin fichas) antes de borrarla.',
      })
      return
    }
    room.scenes.splice(idx, 1)
    if (room.activeSceneId === sceneId) {
      room.activeSceneId = room.scenes[0].id
    }
    syncInitiative(room)
    broadcastRoomState(io, room)
  })
}
