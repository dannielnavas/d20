import { useCallback, useEffect, useMemo, useState } from 'react'

export type DmHudToolId = 'timer' | 'dice' | 'mapAudio' | 'notes' | 'chat'

export const DM_HUD_TOOL_IDS: readonly DmHudToolId[] = [
  'timer',
  'mapAudio',
  'dice',
  'notes',
  'chat',
] as const

export const DM_HUD_LABELS: Record<DmHudToolId, string> = {
  timer: 'Temporizador de turno',
  mapAudio: 'Audio del mapa (vídeo)',
  dice: 'Dados virtuales',
  notes: 'Notas privadas',
  chat: 'Chat y actividad',
}

const STORAGE_GLOBAL = 'd20-dm-hud-layout-v1'

type Stored = {
  order: DmHudToolId[]
  hidden: DmHudToolId[]
}

function isToolId(x: unknown): x is DmHudToolId {
  return x === 'timer' || x === 'dice' || x === 'mapAudio' || x === 'notes' || x === 'chat'
}

function normalizeOrder(raw: unknown): DmHudToolId[] {
  const base = [...DM_HUD_TOOL_IDS]
  if (!Array.isArray(raw)) return base
  const seen = new Set<DmHudToolId>()
  const out: DmHudToolId[] = []
  for (const x of raw) {
    if (!isToolId(x) || seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  for (const id of base) {
    if (!seen.has(id)) out.push(id)
  }
  return out
}

function normalizeHidden(raw: unknown, order: DmHudToolId[]): DmHudToolId[] {
  if (!Array.isArray(raw)) return []
  const ok = new Set(order)
  return raw.filter((x): x is DmHudToolId => isToolId(x) && ok.has(x))
}

function loadStored(roomId: string): Stored {
  try {
    const key = roomId ? `${STORAGE_GLOBAL}:${roomId}` : STORAGE_GLOBAL
    const raw = localStorage.getItem(key) ?? localStorage.getItem(STORAGE_GLOBAL)
    if (!raw) return { order: [...DM_HUD_TOOL_IDS], hidden: [] }
    const o = JSON.parse(raw) as unknown
    if (typeof o !== 'object' || o === null) return { order: [...DM_HUD_TOOL_IDS], hidden: [] }
    const rec = o as Record<string, unknown>
    const order = normalizeOrder(rec.order)
    const hidden = normalizeHidden(rec.hidden, order)
    return { order, hidden }
  } catch {
    return { order: [...DM_HUD_TOOL_IDS], hidden: [] }
  }
}

function saveStored(roomId: string, data: Stored) {
  try {
    const key = roomId ? `${STORAGE_GLOBAL}:${roomId}` : STORAGE_GLOBAL
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* noop */
  }
}

export function useDmHudPreferences(roomId: string) {
  const [order, setOrder] = useState<DmHudToolId[]>(() => [...DM_HUD_TOOL_IDS])
  const [hidden, setHidden] = useState<DmHudToolId[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const s = loadStored(roomId)
    setOrder(s.order)
    setHidden(s.hidden)
    setHydrated(true)
  }, [roomId])

  useEffect(() => {
    if (!hydrated) return
    saveStored(roomId, { order, hidden })
  }, [roomId, order, hidden, hydrated])

  const visibleOrder = useMemo(() => order.filter((id) => !hidden.includes(id)), [order, hidden])

  const setHiddenTool = useCallback((id: DmHudToolId, isHidden: boolean) => {
    setHidden((prev) => {
      const next = isHidden
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id)
      return next
    })
  }, [])

  const moveInOrder = useCallback((id: DmHudToolId, dir: 'up' | 'down') => {
    setOrder((prev) => {
      const i = prev.indexOf(id)
      if (i < 0) return prev
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
  }, [])

  const resetDefaults = useCallback(() => {
    setOrder([...DM_HUD_TOOL_IDS])
    setHidden([])
  }, [])

  return {
    order,
    hidden,
    visibleOrder,
    setHiddenTool,
    moveInOrder,
    resetDefaults,
    labels: DM_HUD_LABELS,
    allIds: DM_HUD_TOOL_IDS,
  }
}
