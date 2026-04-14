import { useEffect, useState } from 'react'
import { dmTokenStorageKey, SOCKET_URL } from './constants'

/**
 * Intercambia la clave DM de la URL por un JWT vía POST /auth/dm (evita reenviar la clave en cada join).
 */
export function useDmTokenExchange(roomId: string, wantsDm: boolean, dmKeyFromUrl: string) {
  const [dmToken, setDmToken] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId || !wantsDm || !dmKeyFromUrl.trim()) {
      setDmToken(null)
      return
    }

    const stored = sessionStorage.getItem(dmTokenStorageKey(roomId))
    if (stored && stored.length > 10) {
      setDmToken(stored)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/auth/dm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dmKey: dmKeyFromUrl }),
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { token?: string }
        if (typeof data.token === 'string' && data.token.length > 0) {
          sessionStorage.setItem(dmTokenStorageKey(roomId), data.token)
          if (!cancelled) setDmToken(data.token)
        }
      } catch {
        /* fallback: joinRoom con dmKey */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roomId, wantsDm, dmKeyFromUrl])

  return dmToken
}
