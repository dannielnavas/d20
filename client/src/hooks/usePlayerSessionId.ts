import { useRef } from 'react'

const STORAGE_PREFIX = 'd20-vtt-player-session-'

function newSessionId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/**
 * Id estable por sala para reclamar y recuperar un PJ al reconectar.
 */
export function usePlayerSessionId(roomId: string, enabled: boolean): string | null {
  const ref = useRef<string | null>(null)

  if (!enabled || !roomId) return null

  if (ref.current) return ref.current

  const key = STORAGE_PREFIX + roomId
  let id = localStorage.getItem(key)
  if (!id || id.length < 8) {
    id = newSessionId()
    localStorage.setItem(key, id)
  }
  ref.current = id
  return ref.current
}
