import { randomInt, randomUUID } from 'crypto'
import type { Express, Request, Response } from 'express'
import type { Server } from 'socket.io'
import { broadcastRoomState, emitDiceRolled } from './room-broadcast.js'
import { getOrCreateRoom } from './rooms.js'
import { findTokenInRoom, getActiveScene } from './scene-helpers.js'
import { snapToGrid } from './snap.js'
import type { DiceMode, DieType } from './types.js'

const DIE_TYPES: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const D20_MODES: DiceMode[] = ['normal', 'advantage', 'disadvantage']

type AutomationEnvelope = {
  action: string
  roomId: string
  payload: Record<string, unknown>
}

function parseEnvelope(body: unknown): AutomationEnvelope | null {
  if (typeof body !== 'object' || body === null) return null
  const obj = body as Record<string, unknown>
  if (typeof obj.action !== 'string' || !obj.action.trim()) return null
  if (typeof obj.roomId !== 'string' || !obj.roomId.trim()) return null
  const payload =
    typeof obj.payload === 'object' && obj.payload !== null
      ? (obj.payload as Record<string, unknown>)
      : {}
  return { action: obj.action.trim(), roomId: obj.roomId.trim(), payload }
}

function readToken(req: Request): string {
  const header = req.header('x-automation-token')
  if (typeof header === 'string' && header.trim()) return header.trim()
  return ''
}

function isLoopback(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || ''
  return ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1')
}

async function hasDmInRoom(io: Server, roomId: string): Promise<boolean> {
  const sockets = await io.in(roomId).fetchSockets()
  return sockets.some((s) => Boolean(s.data?.isDm))
}

function rollValue(max: number): number {
  return randomInt(1, max + 1)
}

function parseDicePayload(payload: Record<string, unknown>): {
  dieType: DieType
  mode: DiceMode
  roller: string
  secret: boolean
} | null {
  if (typeof payload.dieType !== 'string' || !DIE_TYPES.includes(payload.dieType as DieType)) {
    return null
  }
  const dieType = payload.dieType as DieType
  const mode =
    typeof payload.mode === 'string' && D20_MODES.includes(payload.mode as DiceMode)
      ? (payload.mode as DiceMode)
      : 'normal'
  if (dieType !== 'd20' && mode !== 'normal') return null
  const roller =
    typeof payload.roller === 'string' && payload.roller.trim()
      ? payload.roller.trim().slice(0, 64)
      : 'Stream Deck'
  const secret = payload.secret === true
  return { dieType, mode, roller, secret }
}

function parseMapCenterPayload(payload: Record<string, unknown>): {
  tokenId: string
  x?: number
  y?: number
} | null {
  if (typeof payload.tokenId !== 'string' || !payload.tokenId.trim()) return null
  const tokenId = payload.tokenId.trim()
  const out: { tokenId: string; x?: number; y?: number } = { tokenId }
  if (typeof payload.x === 'number' && Number.isFinite(payload.x)) out.x = payload.x
  if (typeof payload.y === 'number' && Number.isFinite(payload.y)) out.y = payload.y
  return out
}

export function registerAutomationApi(app: Express, io: Server): void {
  const enabled = process.env.AUTOMATION_ENABLED === '1'
  const token = process.env.AUTOMATION_TOKEN?.trim() ?? ''
  const localOnly = process.env.AUTOMATION_LOCAL_ONLY !== '0'

  app.post('/automation/actions', async (req: Request, res: Response) => {
    if (!enabled) {
      res.status(404).json({ ok: false, error: 'Automation API deshabilitada' })
      return
    }
    if (!token) {
      res.status(503).json({ ok: false, error: 'AUTOMATION_TOKEN no configurado' })
      return
    }
    if (localOnly && !isLoopback(req)) {
      res.status(403).json({ ok: false, error: 'Solo se permite acceso local' })
      return
    }
    if (readToken(req) !== token) {
      res.status(401).json({ ok: false, error: 'Token de automatización inválido' })
      return
    }

    const envelope = parseEnvelope(req.body)
    if (!envelope) {
      res
        .status(400)
        .json({ ok: false, error: 'Payload inválido: action, roomId y payload son requeridos' })
      return
    }

    const requiresDm = new Set([
      'initiative.next',
      'initiative.visibility',
      'dice.roll',
      'media.playPause',
      'media.volume',
      'map.centerToken',
    ])
    if (requiresDm.has(envelope.action)) {
      const dmActive = await hasDmInRoom(io, envelope.roomId)
      if (!dmActive) {
        res.status(409).json({
          ok: false,
          error: 'No hay sesión de DM activa en esa sala',
        })
        return
      }
    }

    const room = getOrCreateRoom(envelope.roomId)

    switch (envelope.action) {
      case 'initiative.next': {
        if (room.initiative.order.length === 0) {
          res.status(409).json({ ok: false, error: 'No hay iniciativa disponible en la sala' })
          return
        }
        room.initiative.currentIndex =
          room.initiative.currentIndex === null
            ? 0
            : (room.initiative.currentIndex + 1) % room.initiative.order.length
        broadcastRoomState(io, room)
        res.json({ ok: true, action: envelope.action })
        return
      }

      case 'initiative.visibility': {
        if (typeof envelope.payload.visible !== 'boolean') {
          res.status(400).json({ ok: false, error: 'visible debe ser boolean' })
          return
        }
        room.initiative.visible = envelope.payload.visible
        broadcastRoomState(io, room)
        res.json({ ok: true, action: envelope.action, visible: room.initiative.visible })
        return
      }

      case 'dice.roll': {
        const parsed = parseDicePayload(envelope.payload)
        if (!parsed) {
          res.status(400).json({ ok: false, error: 'Payload de dados inválido' })
          return
        }
        const sides = Number(parsed.dieType.slice(1))
        const first = rollValue(sides)
        const second = parsed.dieType === 'd20' && parsed.mode !== 'normal' ? rollValue(20) : null
        const total =
          second === null
            ? first
            : parsed.mode === 'advantage'
              ? Math.max(first, second)
              : Math.min(first, second)
        const entry = {
          id: `roll-automation-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          roller: parsed.roller,
          dieType: parsed.dieType,
          mode: parsed.mode,
          rolls: second === null ? [first] : [first, second],
          total,
          timestamp: Date.now(),
          ...(parsed.secret ? { secret: true as const } : {}),
        }
        room.diceLog.unshift(entry)
        if (room.diceLog.length > 20) room.diceLog = room.diceLog.slice(0, 20)
        void emitDiceRolled(io, room.roomId, entry, null).then(() => {
          broadcastRoomState(io, room)
        })
        res.json({ ok: true, action: envelope.action, result: entry })
        return
      }

      case 'media.playPause': {
        const ms = getActiveScene(room).settings
        if (typeof envelope.payload.enabled === 'boolean') {
          ms.mapAudioEnabled = envelope.payload.enabled
        } else {
          ms.mapAudioEnabled = !ms.mapAudioEnabled
        }
        broadcastRoomState(io, room)
        res.json({
          ok: true,
          action: envelope.action,
          mapAudioEnabled: ms.mapAudioEnabled,
        })
        return
      }

      case 'media.volume': {
        const volume = envelope.payload.volume
        if (typeof volume !== 'number' || !Number.isFinite(volume)) {
          res.status(400).json({ ok: false, error: 'volume debe ser numérico' })
          return
        }
        const ms = getActiveScene(room).settings
        ms.mapVolume = Math.min(100, Math.max(0, Math.round(volume)))
        broadcastRoomState(io, room)
        res.json({ ok: true, action: envelope.action, mapVolume: ms.mapVolume })
        return
      }

      case 'map.centerToken': {
        const parsed = parseMapCenterPayload(envelope.payload)
        if (!parsed) {
          res.status(400).json({ ok: false, error: 'tokenId es requerido' })
          return
        }
        const token = findTokenInRoom(room, parsed.tokenId)
        if (!token) {
          res.status(404).json({ ok: false, error: 'Token no encontrado' })
          return
        }
        const baseX = parsed.x ?? 800
        const baseY = parsed.y ?? 450
        const ms = getActiveScene(room).settings
        if (ms.snapToGrid) {
          const snapped = snapToGrid(baseX, baseY, ms.gridSize)
          token.x = snapped.x
          token.y = snapped.y
        } else {
          token.x = baseX
          token.y = baseY
        }
        io.to(room.roomId).emit('tokenMoveEnd', { tokenId: token.id, x: token.x, y: token.y })
        broadcastRoomState(io, room)
        res.json({ ok: true, action: envelope.action, tokenId: token.id, x: token.x, y: token.y })
        return
      }

      default:
        res.status(400).json({ ok: false, error: `Acción no soportada: ${envelope.action}` })
    }
  })
}
