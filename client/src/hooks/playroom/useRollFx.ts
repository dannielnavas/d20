import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomState } from '../../types/room'

const ROLL_REVEAL_MS = 3500
const ROLL_HIDE_MS = 6000
const SPECIAL_TEXT_HOLD_MS = 4000

export function useRollFx() {
  const [rollFx, setRollFx] = useState<RoomState['diceLog'][number] | null>(null)
  const [rollFxReveal, setRollFxReveal] = useState(false)
  const lastRollIdRef = useRef<string | null>(null)
  const rollFxTimerRef = useRef<number | null>(null)
  const rollFxRevealTimerRef = useRef<number | null>(null)

  const triggerRollFx = useCallback((entry: RoomState['diceLog'][number]) => {
    lastRollIdRef.current = entry.id
    setRollFxReveal(false)
    setRollFx(entry)
    if (rollFxRevealTimerRef.current !== null) {
      window.clearTimeout(rollFxRevealTimerRef.current)
    }
    rollFxRevealTimerRef.current = window.setTimeout(() => {
      setRollFxReveal(true)
      rollFxRevealTimerRef.current = null
    }, ROLL_REVEAL_MS)
    if (rollFxTimerRef.current !== null) {
      window.clearTimeout(rollFxTimerRef.current)
    }
    const isSpecialD20 = entry.dieType === 'd20' && (entry.total === 20 || entry.total === 1)
    const hideAfterMs = isSpecialD20 ? ROLL_REVEAL_MS + SPECIAL_TEXT_HOLD_MS : ROLL_HIDE_MS
    rollFxTimerRef.current = window.setTimeout(() => {
      setRollFx(null)
      setRollFxReveal(false)
      rollFxTimerRef.current = null
    }, hideAfterMs)
  }, [])

  useEffect(
    () => () => {
      if (rollFxRevealTimerRef.current !== null) {
        window.clearTimeout(rollFxRevealTimerRef.current)
      }
      if (rollFxTimerRef.current !== null) {
        window.clearTimeout(rollFxTimerRef.current)
      }
    },
    [],
  )

  return {
    rollFx,
    rollFxReveal,
    triggerRollFx,
    lastRollIdRef,
  }
}
