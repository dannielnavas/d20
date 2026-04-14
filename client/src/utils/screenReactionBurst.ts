export type ScreenReactionBurst = {
  id: string
  reactionId: number
  fromLabel: string
  xPct: number
  yPct: number
}

const SPOTS: readonly { xPct: number; yPct: number }[] = [
  { xPct: 50, yPct: 34 },
  { xPct: 22, yPct: 28 },
  { xPct: 78, yPct: 28 },
  { xPct: 14, yPct: 50 },
  { xPct: 86, yPct: 50 },
  { xPct: 50, yPct: 56 },
  { xPct: 30, yPct: 40 },
  { xPct: 70, yPct: 40 },
  { xPct: 38, yPct: 62 },
  { xPct: 62, yPct: 24 },
]

export function screenReactionSpotForIndex(i: number): { xPct: number; yPct: number } {
  return SPOTS[i % SPOTS.length]!
}

function unwrapScreenReactionObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return first as Record<string, unknown>
    }
    return null
  }
  if (Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

function parseReactionId(rid: unknown): number {
  if (typeof rid === 'number' && Number.isFinite(rid)) return Math.round(rid)
  if (typeof rid === 'string') return Number.parseInt(rid, 10)
  return NaN
}

/** Interpreta el payload de `screenReaction` del servidor (Socket.IO). */
export function parseScreenReactionPayload(
  raw: unknown,
): { reactionId: number; fromLabel: string } | null {
  const o = unwrapScreenReactionObject(raw)
  if (!o) return null
  const reactionId = parseReactionId(o.reactionId)
  if (!Number.isInteger(reactionId) || reactionId < 0 || reactionId > 5) return null
  const fromLabel = typeof o.fromLabel === 'string' ? o.fromLabel : 'Mesa'
  return { reactionId, fromLabel }
}
