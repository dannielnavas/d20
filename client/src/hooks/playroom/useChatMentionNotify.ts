import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomState } from '../../types/room'
import type { SessionState } from '../../types/session'
import { MENTION_DM_ID } from '../../utils/chatMentions'

function recipientMatched(
  session: SessionState | null,
  playerSessionId: string | null,
  mentions: string[],
): boolean {
  if (!session || mentions.length === 0) return false
  if (session.role === 'dm') return mentions.includes(MENTION_DM_ID)
  if (session.role === 'player' && playerSessionId) return mentions.includes(playerSessionId)
  return false
}

export function playMentionChime(): void {
  try {
    const w = globalThis as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctor = w.AudioContext ?? w.webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g)
    g.connect(ctx.destination)
    osc.frequency.value = 920
    g.gain.value = 0.055
    osc.start()
    osc.stop(ctx.currentTime + 0.11)
  } catch {
    /* entornos sin audio */
  }
}

/**
 * Si el chat está colapsado y llega un mensaje que te menciona, aviso visual + sonido
 * (y Notification del navegador si hay permiso, igual que iniciativa).
 */
export function useChatMentionNotify(
  state: RoomState | null,
  session: SessionState | null,
  playerSessionId: string | null,
  chatExpanded: boolean,
): { toast: { author: string; preview: string } | null; dismissToast: () => void } {
  const [toast, setToast] = useState<{ author: string; preview: string } | null>(null)
  const lastHandledId = useRef<string | null>(null)

  useEffect(() => {
    if (!state?.chatLog?.length) return
    const head = state.chatLog[0]

    if (lastHandledId.current === null) {
      lastHandledId.current = head.id
      return
    }
    if (head.id === lastHandledId.current) return

    lastHandledId.current = head.id

    const mentions = head.mentions
    if (!mentions?.length) return
    if (!recipientMatched(session, playerSessionId, mentions)) return
    if (chatExpanded) return

    setToast({ author: head.author, preview: head.text.slice(0, 140) })
    playMentionChime()
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`${head.author} te mencionó`, {
          body: head.text.slice(0, 200),
          tag: `d20-chat-${head.id}`,
        })
      } catch {
        /* algunos entornos restringen Notification */
      }
    }
  }, [state, session, playerSessionId, chatExpanded])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 5200)
    return () => clearTimeout(t)
  }, [toast])

  const dismissToast = useCallback(() => setToast(null), [])

  return { toast, dismissToast }
}
