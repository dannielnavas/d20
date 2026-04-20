import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from './logger.js'
import { getAllRooms, replaceAllRooms } from './rooms.js'
import { getSessionPasswordHashes, replaceSessionPasswordHashes } from './room-session-password.js'
import type { RoomState } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'vtt-snapshot.json')
const REDIS_KEY = 'd20:snapshot'

export function getSnapshotPath(): string {
  return process.env.PERSISTENCE_PATH?.trim() || DEFAULT_PATH
}

type SnapshotFile = {
  version: 1
  savedAt: number
  rooms: Record<string, RoomState>
  sessionPasswordHashes: Record<string, string>
}

// ─── Redis client (lazy singleton) ───────────────────────────────────────────

type RedisClient = Awaited<ReturnType<typeof import('redis').createClient>>

let redisClient: RedisClient | null = null
let redisAttempted = false

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  if (redisClient) return redisClient
  if (redisAttempted) return null

  redisAttempted = true
  try {
    const { createClient } = await import('redis')
    const client = createClient({ url })
    client.on('error', (err: unknown) =>
      log.warn('persistence: redis error', { err: String(err) }),
    )
    await client.connect()
    redisClient = client
    log.info('persistence: conectado a Redis (Upstash)', {
      url: url.replace(/:[^:@/]+@/, ':****@'),
    })
    return redisClient
  } catch (e) {
    log.warn('persistence: no se pudo conectar a Redis, usando disco local', {
      err: String(e),
    })
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSnapshot(raw: string, source: string): SnapshotFile | null {
  try {
    const parsed = JSON.parse(raw) as SnapshotFile
    if (parsed.version !== 1 || !parsed.rooms) {
      log.warn('persistence: snapshot inválido, se ignora', { source })
      return null
    }
    return parsed
  } catch {
    log.warn('persistence: JSON inválido en snapshot', { source })
    return null
  }
}

function applySnapshot(parsed: SnapshotFile): void {
  const map = new Map<string, RoomState>()
  for (const [id, room] of Object.entries(parsed.rooms)) {
    if (room && typeof room === 'object' && typeof room.roomId === 'string') {
      map.set(id, room as RoomState)
    }
  }
  replaceAllRooms(map)
  if (parsed.sessionPasswordHashes && typeof parsed.sessionPasswordHashes === 'object') {
    replaceSessionPasswordHashes(parsed.sessionPasswordHashes)
  }
  log.info('persistence: snapshot aplicado', { rooms: map.size })
}

function buildPayload(): SnapshotFile {
  const rooms = getAllRooms()
  const roomsObj: Record<string, RoomState> = {}
  for (const [k, v] of rooms) {
    const { activePoll: _poll, pendingRollRequests: _prr, raisedHands: _rh, ...rest } = v
    roomsObj[k] = rest as RoomState
  }
  return {
    version: 1,
    savedAt: Date.now(),
    rooms: roomsObj,
    sessionPasswordHashes: getSessionPasswordHashes(),
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function loadSnapshot(): Promise<void> {
  // 1. Intentar desde Redis (Upstash)
  const redis = await getRedisClient()
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY)
      if (raw) {
        const parsed = parseSnapshot(raw, 'redis')
        if (parsed) {
          applySnapshot(parsed)
          log.info('persistence: snapshot cargado desde Redis')
          return
        }
      } else {
        log.info('persistence: sin snapshot en Redis todavía')
      }
    } catch (e) {
      log.warn('persistence: error leyendo Redis, intentando disco', { err: String(e) })
    }
  }

  // 2. Fallback: archivo local
  const filePath = getSnapshotPath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = parseSnapshot(raw, filePath)
    if (parsed) {
      applySnapshot(parsed)
      log.info('persistence: snapshot cargado desde disco', { filePath })
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      log.info('persistence: sin snapshot previo', { filePath })
      return
    }
    log.error('persistence: error al cargar snapshot', {
      filePath,
      err: String(e),
    })
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let dirty = false

export function schedulePersist(): void {
  dirty = true
  if (persistTimer !== null) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    void flushPersist()
  }, 1500)
}

async function flushPersist(): Promise<void> {
  if (!dirty) return
  dirty = false
  const payload = buildPayload()
  const json = JSON.stringify(payload, null, 2)

  // 1. Guardar en Redis si está disponible
  const redis = await getRedisClient()
  if (redis) {
    try {
      await redis.set(REDIS_KEY, json)
      log.info('persistence: snapshot guardado en Redis', {
        rooms: Object.keys(payload.rooms).length,
      })
      return
    } catch (e) {
      log.warn('persistence: error guardando en Redis, intentando disco', { err: String(e) })
    }
  }

  // 2. Fallback: disco local
  const filePath = getSnapshotPath()
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, json, 'utf8')
    log.info('persistence: snapshot guardado en disco', { filePath })
  } catch (e) {
    log.error('persistence: error al guardar en disco', { filePath, err: String(e) })
  }
}

export async function persistNow(): Promise<void> {
  dirty = true
  await flushPersist()
}
