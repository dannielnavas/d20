/**
 * Menciones de chat (@Narrador/@DM, @nombre de PJ). El servidor repite la misma lógica en `server/src/chat-mentions.ts`.
 */
export const MENTION_DM_ID = '__dm__'
const MENTION_NARRATOR_ALIASES = ['Narrador', 'DM']

export type MentionTarget = { id: string; label: string }

type RoomLike = {
  scenes: { tokens: { type: string; name: string; claimedBy: string | null }[] }[]
}

/** Narrador + un PJ por sesión reclamada (nombre de la primera ficha encontrada). */
export function getMentionTargetsFromRoom(state: RoomLike): MentionTarget[] {
  const out: MentionTarget[] = [{ id: MENTION_DM_ID, label: 'Narrador' }]
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
      const aliases = t.id === MENTION_DM_ID ? MENTION_NARRATOR_ALIASES : [t.label]
      const matchedAlias = aliases.find((alias) => {
        if (alias.length === 0) return false
        const prefix = after.slice(0, alias.length)
        if (!sliceEqualIgnoreCase(prefix, alias)) return false
        const next = after[alias.length]
        if (next !== undefined && /[\p{L}\p{N}_]/u.test(next)) return false
        return true
      })
      if (!matchedAlias) continue
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
  return targets.filter((t) =>
    t.id === MENTION_DM_ID
      ? MENTION_NARRATOR_ALIASES.some((alias) => alias.toLowerCase().includes(q))
      : t.label.toLowerCase().includes(q),
  )
}
