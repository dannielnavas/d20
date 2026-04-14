/** Índices 0…5 acordes con el validador del servidor. */
export type QuickReactionId = 0 | 1 | 2 | 3 | 4 | 5

export type QuickReactionDef = {
  id: QuickReactionId
  emoji: string
  label: string
}

/** Seis reacciones rápidas sobre la ficha (evento efímero, no persiste). */
export const TOKEN_QUICK_REACTIONS: readonly QuickReactionDef[] = [
  { id: 0, emoji: '⚔️', label: 'Crítico / impacto' },
  { id: 1, emoji: '💀', label: 'Pifia / fallo' },
  { id: 2, emoji: '😮', label: 'Sorpresa' },
  { id: 3, emoji: '😂', label: 'Risa' },
  { id: 4, emoji: '👏', label: 'Aplauso' },
  { id: 5, emoji: '🔥', label: '¡Brutal!' },
] as const

export function getQuickReaction(id: number): QuickReactionDef | undefined {
  return TOKEN_QUICK_REACTIONS.find((r) => r.id === id)
}
