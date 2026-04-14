import type { Server } from 'socket.io'
import type { Socket } from 'socket.io'

type ActiveTimer = {
  remaining: number
  totalSeconds: number
  interval: ReturnType<typeof setInterval>
}

const timers = new Map<string, ActiveTimer>()

export function getTimerSnapshot(roomId: string): { remaining: number; totalSeconds: number } | null {
  const t = timers.get(roomId)
  if (!t || t.remaining < 0) return null
  return { remaining: t.remaining, totalSeconds: t.totalSeconds }
}

function emitTick(io: Server, roomId: string, remaining: number, totalSeconds: number): void {
  io.to(roomId).emit('timerTick', { remaining, totalSeconds })
}

export function stopRoomTimer(io: Server, roomId: string, emitStopped: boolean): void {
  const t = timers.get(roomId)
  if (!t) return
  clearInterval(t.interval)
  timers.delete(roomId)
  if (emitStopped) {
    io.to(roomId).emit('timerStopped', {})
  }
}

/**
 * Inicia o reinicia la cuenta atrás. Emite `timerTick` al inicio y cada segundo;
 * al llegar a 0 emite el último tick y `timerEnd`.
 */
export function startRoomTimer(io: Server, roomId: string, seconds: number): void {
  stopRoomTimer(io, roomId, false)

  const totalSeconds = Math.min(7200, Math.max(1, Math.round(seconds)))
  let remaining = totalSeconds

  emitTick(io, roomId, remaining, totalSeconds)

  const interval = setInterval(() => {
    const cur = timers.get(roomId)
    if (!cur) return

    remaining -= 1
    cur.remaining = remaining
    emitTick(io, roomId, remaining, totalSeconds)

    if (remaining <= 0) {
      clearInterval(interval)
      timers.delete(roomId)
      io.to(roomId).emit('timerEnd', { totalSeconds })
    }
  }, 1000)

  timers.set(roomId, { remaining, totalSeconds, interval })
}

/** Cliente que acaba de unirse: estado actual del temporizador. */
export function emitTimerSyncToSocket(socket: Socket, roomId: string): void {
  const snap = getTimerSnapshot(roomId)
  if (snap) {
    socket.emit('timerTick', snap)
  }
}
