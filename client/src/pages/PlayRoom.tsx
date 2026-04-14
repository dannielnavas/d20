import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CharacterLobby } from '../components/lobby/CharacterLobby'
import { MapBoard } from '../components/board/MapBoard'
import { GroupPollPanel } from '../components/poll/GroupPollPanel'
import { InitiativePanel } from '../components/initiative/InitiativePanel'
import { MediaDock } from '../components/media/MediaDock'
import { DicePanel } from '../components/dice/DicePanel'
import { ThemeToggle } from '../components/ThemeToggle'
import { ChatPanel } from '../components/chat/ChatPanel'
import { PrivateNotesPanel } from '../components/chat/PrivateNotesPanel'
import { DmHudColumn } from '../components/dm/DmHudColumn'
import { ScreenReactionOverlay } from '../components/reactions/ScreenReactionOverlay'
import { ImageRevealModal } from '../components/reveal/ImageRevealModal'
import { ImageRevealTool } from '../components/reveal/ImageRevealTool'
import { TurnTimerHud } from '../components/timer/TurnTimerHud'
import { usePlayerSessionId } from '../hooks/usePlayerSessionId'
import { D20_ROLL_GIF, sessionPwdStorageKey } from '../hooks/playroom/constants'
import { useChatMentionNotify } from '../hooks/playroom/useChatMentionNotify'
import { useInitiativeTurnNotify } from '../hooks/playroom/useInitiativeTurnNotify'
import { useDmTokenExchange } from '../hooks/playroom/useDmTokenExchange'
import { usePlayRoomSocket } from '../hooks/playroom/usePlayRoomSocket'
import { useRollFx } from '../hooks/playroom/useRollFx'
import type { Token } from '../types/room'
import { allPlayerCharacters } from '../utils/roomTokens'

export function PlayRoom() {
  const { roomId = '' } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const dmKeyFromUrl = searchParams.get('key') ?? ''
  const wantsDm = searchParams.get('role') === 'dm' && dmKeyFromUrl.length > 0
  const wantsSpectator =
    searchParams.get('spectator') === '1' || searchParams.get('spectator') === 'true'

  const playerSessionId = usePlayerSessionId(roomId, !wantsDm && !wantsSpectator)
  const dmToken = useDmTokenExchange(roomId, wantsDm, dmKeyFromUrl)

  const [appliedSessionPassword, setAppliedSessionPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [rememberSessionPwd, setRememberSessionPwd] = useState(false)

  const { rollFx, rollFxReveal, triggerRollFx, lastRollIdRef } = useRollFx()

  const joinPayload = useMemo(() => {
    if (!roomId) return null
    const pwd = appliedSessionPassword.trim()
    const pwdPart = pwd ? { sessionPassword: pwd } : {}
    if (wantsDm) {
      if (dmToken) return { roomId, dmToken, ...pwdPart }
      return { roomId, dmKey: dmKeyFromUrl, ...pwdPart }
    }
    if (wantsSpectator) return { roomId, spectator: true, ...pwdPart }
    if (playerSessionId) return { roomId, playerSessionId, ...pwdPart }
    return null
  }, [
    appliedSessionPassword,
    dmKeyFromUrl,
    dmToken,
    playerSessionId,
    roomId,
    wantsDm,
    wantsSpectator,
  ])

  const {
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
    clearRollRequestFeedback,
    imageReveal,
    dismissImageReveal,
    screenReactionBursts,
  } = usePlayRoomSocket(joinPayload, triggerRollFx, lastRollIdRef)

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'))

  useInitiativeTurnNotify(state, session)

  const [chatExpanded, setChatExpanded] = useState(true)
  const { toast: mentionToast, dismissToast: dismissMentionToast } = useChatMentionNotify(
    state,
    session,
    playerSessionId,
    chatExpanded,
  )

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
  }, [roomId, setPasswordGate])

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
      if (session.role === 'spectator') return false
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
    [socket, setClaimingId, setError],
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

  const onInitiativeRollAll = useCallback(() => {
    if (!socket || !isDm) return
    socket.emit('initiativeRollAll')
  }, [isDm, socket])

  const onInitiativeSetModifier = useCallback(
    (tokenId: string, modifier: number) => {
      if (!socket || !isDm) return
      socket.emit('initiativeSetModifier', { tokenId, modifier })
    },
    [isDm, socket],
  )

  const onResetDiceLog = useCallback(() => {
    if (!socket || !isDm) return
    socket.emit('diceLogReset')
  }, [isDm, socket])

  const showLobby = Boolean(state && session?.role === 'player' && !session.claimedTokenId)

  const showMap = Boolean(
    state &&
    session &&
    (session.role === 'dm' || session.role === 'spectator' || session.claimedTokenId !== null),
  )

  const pcs = state ? allPlayerCharacters(state) : []
  const canUseDicePanel = Boolean(
    socket &&
    state &&
    showMap &&
    session?.role !== 'spectator' &&
    (session?.role === 'dm' || (session?.role === 'player' && session.claimedTokenId)),
  )

  const sessionLabel =
    session?.role === 'dm'
      ? 'Director de juego'
      : session?.role === 'spectator'
        ? 'Espectador: solo ves la mesa'
        : session?.claimedTokenId
          ? 'Jugador en la mesa'
          : 'Elige tu personaje para entrar a la mesa'
  const isCriticalD20 = Boolean(
    rollFxReveal && rollFx && rollFx.dieType === 'd20' && rollFx.total === 20,
  )
  const isCriticalFailD20 = Boolean(
    rollFxReveal && rollFx && rollFx.dieType === 'd20' && rollFx.total === 1,
  )

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
              {roomId || 'Sin identificador'}
            </span>
          </p>
          {session ? (
            <>
              <p className="mt-2 text-sm text-[var(--vtt-text-muted)]">{sessionLabel}</p>
              {session.role === 'player' &&
              session.claimedTokenId &&
              notificationPermission === 'default' ? (
                <button
                  type="button"
                  className="mt-2 text-left text-xs font-semibold text-[var(--vtt-gold)] underline decoration-[var(--vtt-gold-dim)] underline-offset-2 hover:text-[var(--vtt-text)]"
                  onClick={() => {
                    void Notification.requestPermission().then((p) => setNotificationPermission(p))
                  }}
                >
                  Activar avisos del navegador cuando sea tu turno
                </button>
              ) : null}
              {session.role === 'player' &&
              session.claimedTokenId &&
              notificationPermission === 'denied' ? (
                <p className="mt-2 max-w-md text-xs text-[var(--vtt-text-muted)]">
                  Notificaciones bloqueadas en el navegador. Si quieres avisos de turno, permite
                  notificaciones para este sitio en la configuración del navegador.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {isDm ? (
            <button
              type="button"
              className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--vtt-text)] hover:border-[var(--vtt-gold)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onResetDiceLog}
              disabled={!state || state.diceLog.length === 0}
            >
              Borrar historial de tiradas
            </button>
          ) : null}
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
          showMap || (showLobby && session?.role === 'player') ? 'pb-28' : ''
        }`}
      >
        {state && turnTimer ? (
          <TurnTimerHud remaining={turnTimer.remaining} totalSeconds={turnTimer.totalSeconds} />
        ) : null}

        {rollFx ? (
          <div className="dice-roll-overlay" aria-hidden="true">
            <div className="dice-roll-overlay__panel">
              <p className="dice-roll-overlay__title">
                {rollFxReveal ? 'Resultado' : 'Tirada en curso'}
              </p>
              {!rollFxReveal ? (
                <>
                  <img
                    src={D20_ROLL_GIF}
                    alt=""
                    aria-hidden="true"
                    className="dice-roll-overlay__gif"
                  />
                  <p className="dice-roll-overlay__value">Tirando…</p>
                </>
              ) : (
                <>
                  {isCriticalD20 ? <p className="dice-roll-overlay__critical">¡Crítico!</p> : null}
                  {isCriticalFailD20 ? (
                    <p className="dice-roll-overlay__critical-fail">Pifia</p>
                  ) : null}
                  <p className="dice-roll-overlay__value">
                    {rollFx.roller}: {rollFx.dieType} = {rollFx.total}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}

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
                El director de juego ha protegido esta mesa. Escribe la misma contraseña que
                compartió con el grupo (no es la clave privada del director).
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <label
                  htmlFor="gate-session-pwd"
                  className="text-xs font-medium text-[var(--vtt-text-muted)]"
                >
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
                  Recordar en este navegador hasta que cierres la pestaña
                </label>
                <button
                  type="button"
                  onClick={submitSessionPassword}
                  className="vtt-btn-primary w-full"
                >
                  Conectar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!joinPayload && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status">
            Preparando tu acceso…
          </p>
        )}

        {socket && session && state && (showLobby || showMap) ? (
          <div className={showMap ? 'contents' : 'w-full max-w-6xl shrink-0 px-0'}>
            <MediaDock
              socket={socket}
              session={session}
              roomState={state}
              layout={showMap ? 'map' : 'lobby'}
              playerSessionId={!wantsDm && !wantsSpectator ? playerSessionId : null}
              isDm={session.role === 'dm'}
            />
          </div>
        ) : null}

        {showLobby && state && playerSessionId && (
          <CharacterLobby roomId={roomId} pcs={pcs} claimingId={claimingId} onClaim={onClaim} />
        )}

        {showMap && state && socket && (
          <MapBoard
            socket={socket}
            roomState={state}
            setRoomState={setState}
            canDragToken={canDragToken}
            isDm={isDm}
            isSpectator={session?.role === 'spectator'}
            suppressDmMapVideoChrome={isDm}
            showReactionPalette={session?.role === 'player'}
          />
        )}

        {showMap && state && socket && session ? (
          <GroupPollPanel
            socket={socket}
            roomState={state}
            isDm={isDm}
            session={session}
            suppressDmStarter={Boolean(isDm && showMap && !passwordGate)}
          />
        ) : null}

        {showMap && state && socket && isDm && !passwordGate ? (
          <DmHudColumn
            roomId={roomId}
            socket={socket}
            roomState={state}
            privateNotesDmBySession={privateNotesDmBySession}
            timerActive={turnTimer !== null}
            chatExpanded={chatExpanded}
            onChatExpandedChange={setChatExpanded}
            initiativeTokens={allPlayerCharacters(state)}
            onInitiativeToggleVisibility={onInitiativeToggleVisibility}
            onInitiativeMove={onInitiativeMove}
            onInitiativeSetCurrent={onInitiativeSetCurrent}
            onInitiativeNext={onInitiativeNext}
            onInitiativeRollAll={onInitiativeRollAll}
            onInitiativeSetModifier={onInitiativeSetModifier}
          />
        ) : null}

        {showMap &&
        state &&
        socket &&
        session?.role === 'player' &&
        state.settings.playersCanRevealImage &&
        session.claimedTokenId ? (
          <div className="pointer-events-auto fixed bottom-28 left-3 z-[88] max-w-[min(18rem,calc(100vw-1rem))] sm:bottom-32">
            <ImageRevealTool socket={socket} variant="player" />
          </div>
        ) : null}

        {showMap && state && socket && !isDm ? (
          <ChatPanel
            socket={socket}
            roomState={state}
            open={showMap}
            readOnly={session?.role === 'spectator'}
            expanded={chatExpanded}
            onExpandedChange={setChatExpanded}
          />
        ) : null}

        {rollRequestFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-40 z-[94] flex max-w-[min(20rem,calc(100vw-2rem))] items-start gap-3 rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${
              isDm ? 'left-4' : 'right-4'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-vtt-display text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)]">
                {rollRequestFeedback.outcome === 'approved'
                  ? 'Solicitud aprobada'
                  : 'Solicitud cerrada'}
              </p>
              {rollRequestFeedback.outcome === 'approved' ? (
                <p className="mt-1 text-sm text-[var(--vtt-text)]">
                  El director dio luz verde. Puedes tirar cuando quieras con el dado y modo que
                  elegiste al enviar la solicitud
                  {rollRequestFeedback.dieType ? (
                    <>
                      {' '}
                      (<span className="font-mono">{rollRequestFeedback.dieType}</span>
                      {rollRequestFeedback.dieType === 'd20' &&
                      rollRequestFeedback.mode &&
                      rollRequestFeedback.mode !== 'normal'
                        ? rollRequestFeedback.mode === 'advantage'
                          ? ', ventaja'
                          : ', desventaja'
                        : ''}
                      ).
                    </>
                  ) : (
                    '.'
                  )}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--vtt-text-muted)]">
                  El director descartó esta petición. Si sigue en juego, pregunta de nuevo o por el
                  chat.
                </p>
              )}
              {rollRequestFeedback.reason ? (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--vtt-text-muted)]">
                  «{rollRequestFeedback.reason}»
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-2 py-1 text-xs font-semibold text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-text)]"
              onClick={clearRollRequestFeedback}
            >
              Cerrar
            </button>
          </div>
        ) : null}

        {mentionToast ? (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-24 z-[95] flex max-w-[min(20rem,calc(100vw-2rem))] items-start gap-3 rounded-[var(--vtt-radius)] border border-[var(--vtt-gold)] bg-[var(--vtt-bg-elevated)] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${
              isDm ? 'left-4' : 'right-4'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-vtt-display text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)]">
                Te mencionaron
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--vtt-text)]">
                {mentionToast.author}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-[var(--vtt-text-muted)]">
                {mentionToast.preview}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-2 py-1 text-xs font-semibold text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-text)]"
                onClick={() => {
                  dismissMentionToast()
                  setChatExpanded(true)
                }}
              >
                Abrir chat
              </button>
              <button
                type="button"
                className="text-xs text-[var(--vtt-text-muted)] underline-offset-2 hover:text-[var(--vtt-text)] hover:underline"
                onClick={dismissMentionToast}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        {socket && state && session?.role === 'dm' && !showMap ? (
          <PrivateNotesPanel
            variant="dm"
            socket={socket}
            roomState={state}
            bySession={privateNotesDmBySession}
            open
          />
        ) : null}

        {socket && state && session?.role === 'player' && playerSessionId ? (
          <PrivateNotesPanel
            variant="player"
            socket={socket}
            pair={privateNotesPlayerPair}
            open={showLobby || showMap}
          />
        ) : null}

        {showMap && state && socket && !isDm ? (
          <InitiativePanel
            placement="floating"
            initiative={state.initiative}
            tokens={allPlayerCharacters(state)}
            isDm={false}
            onToggleVisibility={onInitiativeToggleVisibility}
            onMove={onInitiativeMove}
            onSetCurrent={onInitiativeSetCurrent}
            onNext={onInitiativeNext}
            onRollAll={onInitiativeRollAll}
            onSetModifier={onInitiativeSetModifier}
          />
        ) : null}

        {canUseDicePanel && socket && state && !(session?.role === 'dm' && showMap) ? (
          <DicePanel
            socket={socket}
            roomState={state}
            isDm={session?.role === 'dm'}
            playerSessionId={session?.role === 'player' ? playerSessionId : null}
            canRequestRoll={session?.role === 'player' && Boolean(session.claimedTokenId)}
          />
        ) : null}

        {joinPayload && state && !session && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status" aria-live="polite">
            Preparando tu lugar en la mesa…
          </p>
        )}

        {joinPayload && !state && !error && (
          <p className="text-sm text-[var(--vtt-text-muted)]" role="status" aria-live="polite">
            Cargando la mesa…
          </p>
        )}

        {import.meta.env.DEV && state && showMap ? (
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

        <ImageRevealModal reveal={imageReveal} onDismiss={dismissImageReveal} />

        {socket && state && session ? (
          <ScreenReactionOverlay bursts={screenReactionBursts} />
        ) : null}
      </main>
    </div>
  )
}
