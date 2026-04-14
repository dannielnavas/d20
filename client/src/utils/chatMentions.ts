/**
 * Menciones de chat (@DM, @nombre de PJ). El servidor repite la misma lógica en `server/src/chat-mentions.ts`.
 */
export const MENTION_DM_ID = '__dm__'

export type MentionTarget = { id: string; label: string }

type RoomLike = {
  scenes: { tokens: { type: string; name: string; claimedBy: string | null }[] }[]
}

/** DM + un PJ por sesión reclamada (nombre de la primera ficha encontrada). */
export function getMentionTargetsFromRoom(state: RoomLike): MentionTarget[] {
  const out: MentionTarget[] = [{ id: MENTION_DM_ID, label: 'DM' }]
  const seen = new Set<string>()
  for (const sc of state.scenes) {
    for (const t of sc.tokens) {
      if (t.type !== 'pc' || !t.claimedBy) continue
      if (seen.has(t.claimedBy)) continue
      seen.add(t.claimedBy)
      out.push({ id: t.claimedBy, label: t.name })
    }
  }
  return out
}

function sliceEqualIgnoreCase(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Recorre el texto buscando `@etiqueta` (detrás de inicio o espacio/salto).
 * Etiquetas más largas primero para desambiguar prefijos.
 */
export function parseMentionsInText(text: string, targets: MentionTarget[]): string[] {
  const sorted = [...targets].sort((a, b) => b.label.length - a.label.length)
  const ids: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '@') continue
    if (i > 0 && !/[\s\n]/.test(text[i - 1]!)) continue
    const after = text.slice(i + 1)
    for (const t of sorted) {
      if (t.label.length === 0) continue
      const prefix = after.slice(0, t.label.length)
      if (!sliceEqualIgnoreCase(prefix, t.label)) continue
      const next = after[t.label.length]
      if (next !== undefined && /[\p{L}\p{N}_]/u.test(next)) continue
      if (!seen.has(t.id)) {
        seen.add(t.id)
        ids.push(t.id)
      }
      break
    }
  }
  return ids
}

export function filterMentionTargets(targets: MentionTarget[], query: string): MentionTarget[] {
  const q = query.trim().toLowerCase()
  if (!q) return targets
  return targets.filter((t) => t.label.toLowerCase().includes(q))
}
