import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import type { DiceMode, DieType, RoomState, RollRequestFeedback } from '../../types/room'
import type { ImageRevealPayload } from '../../types/image-reveal'
import type { SessionState } from '../../types/session'
import { SOCKET_URL } from './constants'
import {
  normalizeRoomState,
  parseDiceLogEntry,
  parseSessionState,
  type TokenPosEvent,
} from './roomParsers'
import type { PrivateNotesPair } from '../../types/private-notes'
import {
  parseScreenReactionPayload,
  screenReactionSpotForIndex,
  type ScreenReactionBurst,
} from '../../utils/screenReactionBurst'

export type JoinPayload = {
  roomId: string
  dmKey?: string
  dmToken?: string
  playerSessionId?: string
  sessionPassword?: string
  /** Solo lectura: mapa y logs, sin mover fichas ni chatear. */
  spectator?: boolean
} | null

export function usePlayRoomSocket(
  joinPayload: JoinPayload,
  triggerRollFx: (entry: RoomState['diceLog'][number]) => void,
  lastRollIdRef: MutableRefObject<string | null>,
): {
  state: RoomState | null
  setState: Dispatch<SetStateAction<RoomState | null>>
  session: SessionState | null
  socket: Socket | null
  error: string | null
  setError: Dispatch<SetStateAction<string | null>>
  connected: boolean
  claimingId: string | null
  setClaimingId: Dispatch<SetStateAction<string | null>>
  passwordGate: boolean
  setPasswordGate: Dispatch<SetStateAction<boolean>>
  /** Solo jugador: notas DM ↔ jugador para esta sesión. */
  privateNotesPlayerPair: PrivateNotesPair | null
  /** Solo DM: mapa por id de sesión de jugador. */
  privateNotesDmBySession: Record<string, PrivateNotesPair>
  /** Cuenta atrás de turno (servidor emite `timerTick` cada segundo). */
  turnTimer: { remaining: number; totalSeconds: number } | null
  /** Jugador: el DM respondió a una solicitud de tirada. */
  rollRequestFeedback: RollRequestFeedback | null
  clearRollRequestFeedback: () => void
  imageReveal: ImageRevealPayload | null
  dismissImageReveal: () => void
  /** Ráfagas visuales de `screenReaction` (overlay a pantalla completa). */
  screenReactionBursts: readonly ScreenReactionBurst[]
} {
  const [state, setState] = useState<RoomState | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [passwordGate, setPasswordGate] = useState(false)
  const [privateNotesPlayerPair, setPrivateNotesPlayerPair] = useState<PrivateNotesPair | null>(null)
  const [privateNotesDmBySession, setPrivateNotesDmBySession] = useState<
    Record<string, PrivateNotesPair>
  >({})
  const [turnTimer, setTurnTimer] = useState<{
    remaining: number
    totalSeconds: number
  } | null>(null)
  const [rollRequestFeedback, setRollRequestFeedback] = useState<RollRequestFeedback | null>(null)
  const [imageReveal, setImageReveal] = useState<ImageRevealPayload | null>(null)
  const [screenReactionBursts, setScreenReactionBursts] = useState<ScreenReactionBurst[]>([])

  const dismissImageReveal = useCallback(() => setImageReveal(null), [])

  useEffect(() => {
    if (!joinPayload) return

    setState(null)
    setSession(null)
    setTurnTimer(null)
    setError(null)
    setClaimingId(null)
    setPrivateNotesPlayerPair(null)
    setPrivateNotesDmBySession({})
    setRollRequestFeedback(null)
    setImageReveal(null)
    setScreenReactionBursts([])

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    })
    setSocket(s)

    /** Tras reconexión el socket es nuevo en el servidor: hay que volver a unirse a la sala. */
    const onConnect = () => {
      setConnected(true)
      s.emit('joinRoom', joinPayload)
    }
    const onDisconnect = () => setConnected(false)
    const onRoomState = (payload: RoomState) => {
      setState(normalizeRoomState(payload))
      setError(null)
      setPasswordGate(false)
    }
    const onRoomError = (payload: { message?: string; code?: string }) => {
      const code = payload?.code
      if (code === 'SESSION_PASSWORD_REQUIRED' || code === 'SESSION_PASSWORD_INVALID') {
        setPasswordGate(true)
      }
      setError(payload?.message ?? 'No pudimos cargar la mesa. Recarga la página o inténtalo más tarde.')
    }
    const onTokenError = (payload: { message?: string }) => {
      setError(
        payload?.message ?? 'Esa ficha no la controlas tú: elige la tuya o pide permiso al director.',
      )
    }
    const onClaimError = (payload: { message?: string }) => {
      setClaimingId(null)
      setError(payload?.message ?? 'No pudimos asignarte ese personaje. Prueba con otro o recarga la página.')
    }
    const onDmError = (payload: { message?: string }) => {
      setError(payload?.message ?? 'Solo el director de juego puede hacer eso desde su panel.')
    }

    const applyTokenPos = ({ tokenId, x, y }: TokenPosEvent) => {
      setState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tokens: prev.tokens.map((t) => (t.id === tokenId ? { ...t, x, y } : t)),
        }
      })
    }

    const onTokenMove = (p: TokenPosEvent) => applyTokenPos(p)
    const onTokenMoveEnd = (p: TokenPosEvent) => applyTokenPos(p)

    const onSessionState = (raw: unknown) => {
      const parsed = parseSessionState(raw)
      if (parsed) setSession(parsed)
      setClaimingId(null)
    }
    const onDiceRolled = (raw: unknown) => {
      const parsed = parseDiceLogEntry(raw)
      if (!parsed) return
      triggerRollFx(parsed)
    }

    const onPrivateNotesSync = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const o = raw as Record<string, unknown>
      setPrivateNotesPlayerPair({
        dm: typeof o.dm === 'string' ? o.dm : '',
        player: typeof o.player === 'string' ? o.player : '',
      })
    }

    const onPrivateNotesDmSnapshot = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const next: Record<string, PrivateNotesPair> = {}
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!v || typeof v !== 'object') continue
        const e = v as Record<string, unknown>
        next[k] = {
          dm: typeof e.dm === 'string' ? e.dm : '',
          player: typeof e.player === 'string' ? e.player : '',
        }
      }
      setPrivateNotesDmBySession(next)
    }

    const onPrivateNotesDmUpdate = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const o = raw as Record<string, unknown>
      const sid = typeof o.playerSessionId === 'string' ? o.playerSessionId : ''
      if (!sid) return
      setPrivateNotesDmBySession((prev) => ({
        ...prev,
        [sid]: {
          dm: typeof o.dm === 'string' ? o.dm : '',
          player: typeof o.player === 'string' ? o.player : '',
        },
      }))
    }

    const onTimerTick = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const o = raw as Record<string, unknown>
      if (typeof o.remaining !== 'number' || typeof o.totalSeconds !== 'number') return
      if (!Number.isFinite(o.remaining) || !Number.isFinite(o.totalSeconds)) return
      setTurnTimer({
        remaining: Math.max(0, Math.floor(o.remaining)),
        totalSeconds: Math.max(1, Math.floor(o.totalSeconds)),
      })
    }
    const onTimerEnd = () => setTurnTimer(null)
    const onTimerStopped = () => setTurnTimer(null)

    const onRollRequestResolved = (raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) return
      const o = raw as Record<string, unknown>
      if (o.outcome !== 'approved' && o.outcome !== 'dismissed') return
      if (typeof o.requestId !== 'string') return
      const fb: RollRequestFeedback = {
        requestId: o.requestId,
        outcome: o.outcome,
      }
      if (typeof o.dieType === 'string') fb.dieType = o.dieType as DieType
      if (typeof o.mode === 'string') fb.mode = o.mode as DiceMode
      if (typeof o.reason === 'string') fb.reason = o.reason
      setRollRequestFeedback(fb)
    }

    const onRollRequestRejected = (raw: unknown) => {
      let msg = 'No se pudo enviar la solicitud.'
      if (typeof raw === 'object' && raw !== null) {
        const m = (raw as Record<string, unknown>).message
        if (typeof m === 'string' && m.trim()) msg = m
      }
      setError(msg)
    }

    const onImageReveal = (raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) return
      const o = raw as Record<string, unknown>
      if (typeof o.url !== 'string' || !o.url.trim()) return
      const durationMs =
        typeof o.durationMs === 'number' && Number.isFinite(o.durationMs) && o.durationMs > 0
          ? Math.min(120_000, Math.floor(o.durationMs))
          : 10_000
      setImageReveal({ url: o.url.trim(), durationMs })
    }

    const onScreenReaction = (raw: unknown) => {
      const parsed = parseScreenReactionPayload(raw)
      if (!parsed) return
      const id = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      setScreenReactionBursts((prev) => {
        const idx = prev.length
        const { xPct, yPct } = screenReactionSpotForIndex(idx)
        const next: ScreenReactionBurst = {
          id,
          reactionId: parsed.reactionId,
          fromLabel: parsed.fromLabel,
          xPct,
          yPct,
        }
        return [...prev.slice(-8), next]
      })
      window.setTimeout(() => {
        setScreenReactionBursts((prev) => prev.filter((b) => b.id !== id))
      }, 4200)
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('roomState', onRoomState)
    s.on('roomError', onRoomError)
    s.on('tokenError', onTokenError)
    s.on('claimError', onClaimError)
    s.on('dmError', onDmError)
    s.on('sessionState', onSessionState)
    s.on('diceRolled', onDiceRolled)
    s.on('tokenMove', onTokenMove)
    s.on('tokenMoveEnd', onTokenMoveEnd)
    s.on('privateNotesSync', onPrivateNotesSync)
    s.on('privateNotesDmSnapshot', onPrivateNotesDmSnapshot)
    s.on('privateNotesDmUpdate', onPrivateNotesDmUpdate)
    s.on('timerTick', onTimerTick)
    s.on('timerEnd', onTimerEnd)
    s.on('timerStopped', onTimerStopped)
    s.on('rollRequestResolved', onRollRequestResolved)
    s.on('rollRequestRejected', onRollRequestRejected)
    s.on('imageReveal', onImageReveal)
    s.on('screenReaction', onScreenReaction)

    if (s.connected) {
      onConnect()
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('roomState', onRoomState)
      s.off('roomError', onRoomError)
      s.off('tokenError', onTokenError)
      s.off('claimError', onClaimError)
      s.off('dmError', onDmError)
      s.off('sessionState', onSessionState)
      s.off('diceRolled', onDiceRolled)
      s.off('tokenMove', onTokenMove)
      s.off('tokenMoveEnd', onTokenMoveEnd)
      s.off('privateNotesSync', onPrivateNotesSync)
      s.off('privateNotesDmSnapshot', onPrivateNotesDmSnapshot)
      s.off('privateNotesDmUpdate', onPrivateNotesDmUpdate)
      s.off('timerTick', onTimerTick)
      s.off('timerEnd', onTimerEnd)
      s.off('timerStopped', onTimerStopped)
      s.off('rollRequestResolved', onRollRequestResolved)
      s.off('rollRequestRejected', onRollRequestRejected)
      s.off('imageReveal', onImageReveal)
      s.off('screenReaction', onScreenReaction)
      s.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [joinPayload, triggerRollFx])

  useEffect(() => {
    const latest = state?.diceLog?.[0]
    if (!latest) return
    if (lastRollIdRef.current === null) {
      triggerRollFx(latest)
      return
    }
    if (lastRollIdRef.current === latest.id) return
    triggerRollFx(latest)
  }, [state?.diceLog, triggerRollFx, lastRollIdRef])

  return {
    state,
    setState,
    session,
    socket,
    error,
    setError,
    connected,
    claimingId,
    setClaimingId,
    passwordGate,
    setPasswordGate,
    privateNotesPlayerPair,
    privateNotesDmBySession,
    turnTimer,
    rollRequestFeedback,
    clearRollRequestFeedback: () => setRollRequestFeedback(null),
    imageReveal,
    dismissImageReveal,
    screenReactionBursts,
  }
}
