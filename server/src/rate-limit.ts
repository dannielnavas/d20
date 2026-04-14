/**
 * Rate limiting por socket: ventana fija de 1s.
 */
const buckets = new Map<string, { windowStart: number; count: number }>()

const WINDOW_MS = 1000

export function allowSocketEvent(
  socketId: string,
  eventName: string,
  maxPerWindow: number,
): boolean {
  const now = Date.now()
  const key = `${socketId}:${eventName}`
  let b = buckets.get(key)
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { windowStart: now, count: 0 }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count > maxPerWindow) {
    return false
  }
  return true
}

export function clearSocketLimits(socketId: string): void {
  for (const k of buckets.keys()) {
    if (k.startsWith(`${socketId}:`)) buckets.delete(k)
  }
}
