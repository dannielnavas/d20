import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import { CharacterLobby } from '../components/lobby/CharacterLobby'
import { MapBoard } from '../components/board/MapBoard'
import { InitiativePanel } from '../components/initiative/InitiativePanel'
import { MediaDock } from '../components/media/MediaDock'
import { DicePanel } from '../components/dice/DicePanel'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePlayerSessionId } from '../hooks/usePlayerSessionId'
import type { RoomState, Token } from '../types/room'
import type { SessionState } from '../types/session'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

type TokenPosEvent = { tokenId: string; x: number; y: number }

const sessionPwdStorageKey = (id: string) => `d20-vtt-session-pwd-${id}`

function parseSessionState(payload: unknown): SessionState | null {
  if (typeof payload !== 'object' || payload === null) return null
  const o = payload as Record<string, unknown>
  if (o.role !== 'dm' && o.role !== 'player') return null
  let claimedTokenId: string | null = null
  if (typeof o.claimedTokenId === 'string' && o.claimedTokenId.length > 0) {
    claimedTokenId = o.claimedTokenId
  }
  return {
    role: o.role,
    claimedTokenId,
  }
}

export function PlayRoom() {
  const { roomId = '' } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const dmKeyFromUrl = searchParams.get('key') ?? ''
  const wantsDm =
    searchParams.get('role') === 'dm' && dmKeyFromUrl.length > 0

  const playerSessionId = usePlayerSessionId(roomId, !wantsDm)

  const [state, setState] = useState<RoomState | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [appliedSessionPassword, setAppliedSessionPassword] = useState('')
  const [passwordGate, setPasswordGate] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [rememberSessionPwd, setRememberSessionPwd] = useState(false)

  useEffect(() => {
    if (!roomId) {
      setAppliedSessionPassword('')
      setPasswordGate(false)
      setPasswordInput('')
      return
    }
    setAppliedSessionPassword(sessionStorage.getItem(sessionPwdStorageKey(roomId)) ?? '')
    setPasswordGate(false)
    setPasswordInput('')
  }, [roomId])

  const joinPayload = useMemo(() => {
    if (!roomId) return null
    const pwd = appliedSessionPassword.trim()
    const pwdPart = pwd ? { sessionPassword: pwd } : {}
    if (wantsDm) return { roomId, dmKey: dmKeyFromUrl, ...pwdPart }
    if (playerSessionId) return { roomId, playerSessionId, ...pwdPart }
    return null
  }, [appliedSessionPassword, dmKeyFromUrl, playerSessionId, roomId, wantsDm])

  useEffect(() => {
    if (!joinPayload) return

    setState(null)
    setSession(null)
    setError(null)
    setClaimingId(null)

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    })
    setSocket(s)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onRoomState = (payload: RoomState) => {
      setState(payload)
      setError(null)
      setPasswordGate(false)
    }
    const onRoomError = (payload: { message?: string; code?: string }) => {
      const code = payload?.code
      if (code === 'SESSION_PASSWORD_REQUIRED' || code === 'SESSION_PASSWORD_INVALID') {
        setPasswordGate(true)
      }
      setError(payload?.message ?? 'Error de sala')
    }
    const onTokenError = (payload: { message?: string }) => {
      setError(payload?.message ?? 'No autorizado para mover ese token')
    }
    const onClaimError = (payload: { message?: string }) => {
      setClaimingId(null)
      setError(payload?.message ?? 'No se pudo reclamar el personaje')
    }
    const onDmError = (payload: { message?: string }) => {
      setError(payload?.message ?? 'Acción de DM rechazada')
    }

    const applyTokenPos = ({ tokenId, x, y }: TokenPosEvent) => {
      setState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tokens: prev.tokens.map((t) =>
            t.id === tokenId ? { ...t, x, y } : t,
          ),
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

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('roomState', onRoomState)
    s.on('roomError', onRoomError)
    s.on('tokenError', onTokenError)
    s.on('claimError', onClaimError)
    s.on('dmError', onDmError)
    s.on('sessionState', onSessionState)
    s.on('tokenMove', onTokenMove)
    s.on('tokenMoveEnd', onTokenMoveEnd)

    s.emit('joinRoom', joinPayload)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('roomState', onRoomState)
      s.off('roomError', onRoomError)
      s.off('tokenError', onTokenError)
      s.off('claimError', onClaimError)
      s.off('dmError', onDmError)
      s.off('sessionState', onSessionState)
      s.off('tokenMove', onTokenMove)
      s.off('tokenMoveEnd', onTokenMoveEnd)
      s.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [joinPayload])

  useEffect(() => {
    if (passwordGate) {
      setPasswordInput(appliedSessionPassword)
    }
  }, [appliedSessionPassword, passwordGate])

  const submitSessionPassword = useCallback(() => {
    if (!roomId) return
    const key = sessionPwdStorageKey(roomId)
    const p = passwordInput.trim()
    if (rememberSessionPwd) sessionStorage.setItem(key, p)
    else sessionStorage.removeItem(key)
    setAppliedSessionPassword(p)
  }, [passwordInput, rememberSessionPwd, roomId])

  const canDragToken = useCallback(
    (token: Token) => {
      if (!session) return false
      if (session.role === 'dm') return true
      if (token.type === 'npc') return false
      return session.claimedTokenId === token.id
    },
    [session],
  )

  const onClaim = useCallback(
    (tokenId: string) => {
      if (!socket) return
      setClaimingId(tokenId)
      setError(null)
      socket.emit('claimPc', { tokenId })
    },
    [socket],
  )

  const isDm = session?.role === 'dm'

  const onInitiativeToggleVisibility = useCallback(
    (visible: boolean) => {
      if (!socket || !isDm) return
      socket.emit('initiativeToggleVisibility', { visible })
    },
    [isDm, socket],
  )

  const onInitiativeMove = useCallback(
    (tokenId: string, direction: 'up' | 'down') => {
      if (!socket || !isDm) return
      socket.emit('initiativeMove', { tokenId, direction })
    },
    [isDm, socket],
  )

  const onInitiativeSetCurrent = useCallback(
    (tokenId: string) => {
      if (!socket || !isDm) return
      socket.emit('initiativeSetCurrent', { tokenId })
    },
    [isDm, socket],
  )

  const onInitiativeNext = useCallback(() => {
    if (!socket || !isDm) return
    socket.emit('initiativeNext')
  }, [isDm, socket])

  const showLobby =
    Boolean(state && session?.role === 'player' && !session.claimedTokenId)

  const showMap =
    Boolean(
      state &&
        session &&
        (session.role === 'dm' || session.claimedTokenId !== null),
    )

  const pcs = state?.tokens.filter((t) => t.type === 'pc') ?? []

  const sessionLabel =
    session?.role === 'dm'
      ? 'Dungeon Master'
      : session?.claimedTokenId
        ? 'Jugador en mesa'
        : 'Jugador, lobby de personajes'

  return (
    <div className="font-vtt-body flex min-h-svh flex-col gap-4 px-4 py-4 text-left md:px-6">
      <a href="#contenido-sala" className="skip-link">
        Saltar al contenido de la sala
      </a>

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--vtt-border-subtle)] pb-4">
        <div>
          <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--vtt-gold-dim)]">
            Sala activa
          </p>
          <p className="font-vtt-display mt-1 text-xl font-semibold tracking-wide text-[var(--vtt-text)]">
            <span className="font-mono text-[0.95em] font-normal text-[var(--vtt-gold)]">
              {roomId || '(sin id)'}
            </span>
          </p>
          {session ? (
            <p className="mt-2 text-sm text-[var(--vtt-text-muted)]">{sessionLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ThemeToggle />
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-[var(--vtt-text-muted)]"
          >
            <span className="sr-only">Estado de conexión: </span>
            <span
              className={
                connected
                  ? 'font-medium text-[var(--vtt-forest)]'
                  : 'font-medium text-[var(--vtt-ember)]'
              }
            >
              {connected ? '● Conectado' : '○ Conectando…'}
            </span>
          </div>
          <Link to="/" className="vtt-link text-sm font-semibold">
            Inicio
          </Link>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--vtt-radius)] border border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-4 py-3 text-sm text-[var(--vtt-danger-text)]"
        >
          <p className="min-w-0 flex-1">{error}</p>
          <button
            type="button"
            className="shrink-0 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-danger-border)] bg-[var(--vtt-bg-elevated)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--vtt-text)] hover:border-[var(--vtt-gold)]"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      ) : null}

      <main
        id="contenido-sala"
        tabIndex={-1}
        className={`relative flex min-h-0 flex-1 flex-col items-center gap-6 outline-none ${
          showMap ? 'pb-28' : ''
        }`}
      >
        {passwordGate && roomId ? (
          <div
            className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-[var(--vtt-bg)]/90 px-4 py-10 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-sesion-titulo"
          >
            <div className="vtt-surface vtt-glow-border w-full max-w-md p-6 shadow-lg">
              <h2
                id="gate-sesion-titulo"
                className="font-vtt-display text-lg font-semibold tracking-wide text-[var(--vtt-gold)]"
              >
                Contraseña de la mesa
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--vtt-text-muted)]">
                El DM ha protegido esta sesión. Introduce la misma contraseña que compartió con el
                grupo (no es la clave secreta del DM).
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <label htmlFor="gate-session-pwd" className="text-xs font-medium text-[var(--vtt-text-muted)]">
                  Contraseña
                </label>
                <input
                  id="gate-session-pwd"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSessionPassword()
                  }}
                  className="vtt-input"
                  autoComplete="off"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--vtt-text)]">
                  <input
                    type="checkbox"
                    checked={rememberSessionPwd}
                    onChange={(e) => setRememberSessionPwd(e.target.checked)}
                    className="size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)]"
                  />
                  Recordar en este navegador (sessionStorage)
                </label>
                <button type="button" onClick={submitSessionPassword} className="vtt-btn-primary w-full">
                  Conectar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!joinPayload && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status">
            Preparando sesión…
          </p>
        )}

        {socket && session && state && (showLobby || showMap) ? (
          <div
            className={
              showMap ? 'contents' : 'w-full max-w-6xl shrink-0 px-0'
            }
          >
            <MediaDock
              socket={socket}
              session={session}
              roomState={state}
              layout={showMap ? 'map' : 'lobby'}
            />
          </div>
        ) : null}

        {showLobby && state && playerSessionId && (
          <CharacterLobby
            roomId={roomId}
            pcs={pcs}
            claimingId={claimingId}
            onClaim={onClaim}
          />
        )}

        {showMap && state && socket && (
          <MapBoard
            socket={socket}
            roomState={state}
            setRoomState={setState}
            canDragToken={canDragToken}
            isDm={isDm}
          />
        )}

        {showMap && state && socket && (
          <InitiativePanel
            initiative={state.initiative}
            tokens={state.tokens.filter((t) => t.type === 'pc')}
            isDm={isDm}
            onToggleVisibility={onInitiativeToggleVisibility}
            onMove={onInitiativeMove}
            onSetCurrent={onInitiativeSetCurrent}
            onNext={onInitiativeNext}
          />
        )}

        {socket && state && session && (showLobby || showMap) ? (
          <DicePanel socket={socket} roomState={state} />
        ) : null}

        {joinPayload && state && !session && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status" aria-live="polite">
            Sincronizando sesión…
          </p>
        )}

        {joinPayload && !state && !error && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status" aria-live="polite">
            Esperando estado del servidor…
          </p>
        )}

        {state && showMap ? (
          <details className="vtt-surface vtt-glow-border w-full max-w-4xl shrink-0 overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--vtt-text)] hover:bg-[var(--vtt-surface-warm)]">
              Estado JSON (depuración)
            </summary>
            <pre
              className="max-h-48 overflow-auto border-t border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] p-4 font-mono text-xs leading-relaxed text-[var(--vtt-text-muted)]"
              tabIndex={0}
            >
              {JSON.stringify(state, null, 2)}
            </pre>
          </details>
        ) : null}
      </main>
    </div>
  )
}
