import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from './logger.js'
import { getAllRooms, replaceAllRooms } from './rooms.js'
import { getSessionPasswordHashes, replaceSessionPasswordHashes } from './room-session-password.js'
import type { RoomState } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'vtt-snapshot.json')

export function getSnapshotPath(): string {
  return process.env.PERSISTENCE_PATH?.trim() || DEFAULT_PATH
}

type SnapshotFile = {
  version: 1
  savedAt: number
  rooms: Record<string, RoomState>
  sessionPasswordHashes: Record<string, string>
}

export async function loadSnapshot(): Promise<void> {
  const filePath = getSnapshotPath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as SnapshotFile
    if (parsed.version !== 1 || !parsed.rooms) {
      log.warn('persistence: snapshot inválido, se ignora', { filePath })
      return
    }
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
    log.info('persistence: snapshot cargado', {
      filePath,
      rooms: map.size,
    })
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
  const filePath = getSnapshotPath()
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    const rooms = getAllRooms()
    const roomsObj: Record<string, RoomState> = {}
    for (const [k, v] of rooms) {
      const {
        activePoll: _poll,
        pendingRollRequests: _prr,
        raisedHands: _rh,
        ...rest
      } = v
      roomsObj[k] = rest as RoomState
    }
    const payload: SnapshotFile = {
      version: 1,
      savedAt: Date.now(),
      rooms: roomsObj,
      sessionPasswordHashes: getSessionPasswordHashes(),
    }
    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
    log.info('persistence: snapshot guardado', { filePath, rooms: rooms.size })
  } catch (e) {
    log.error('persistence: error al guardar', { filePath, err: String(e) })
  }
}

export async function persistNow(): Promise<void> {
  dirty = true
  await flushPersist()
}
