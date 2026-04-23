import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { type DmHudToolId, useDmHudPreferences } from '../../hooks/useDmHudPreferences'
import type { PrivateNotesPair } from '../../types/private-notes'
import type { RoomState, Token } from '../../types/room'
import { ChatPanel } from '../chat/ChatPanel'
import { PrivateNotesPanel } from '../chat/PrivateNotesPanel'
import { DicePanel } from '../dice/DicePanel'
import { InitiativePanel } from '../initiative/InitiativePanel'
import { PollStartModal } from '../poll/PollStartModal'
import { ScreenReactionPalette } from '../reactions/ScreenReactionPalette'
import { ImageRevealTool } from '../reveal/ImageRevealTool'
import { DmTurnTimerBar } from '../timer/DmTurnTimerBar'
import { DmCollapsibleCard } from './DmCollapsibleCard'
import { MapDmVideoAudioCard } from './MapDmVideoAudioCard'
import { RollRequestInbox } from './RollRequestInbox'

export type DmHudColumnProps = {
  roomId: string
  socket: Socket
  roomState: RoomState
  privateNotesDmBySession: Record<string, PrivateNotesPair>
  timerActive: boolean
  chatExpanded: boolean
  onChatExpandedChange: (v: boolean) => void
  chatScrollToMessageId?: string | null
  onChatScrollHandled?: (messageId: string) => void
  initiativeTokens: Token[]
  onInitiativeToggleVisibility: (visible: boolean) => void
  onInitiativeMove: (tokenId: string, direction: 'up' | 'down') => void
  onInitiativeSetCurrent: (tokenId: string) => void
  onInitiativeNext: () => void
  onInitiativeRollAll: () => void
  onInitiativeSetModifier: (tokenId: string, modifier: number) => void
  onVisibilityChange?: (visible: boolean) => void
}

export function DmHudColumn({
  roomId,
  socket,
  roomState,
  privateNotesDmBySession,
  timerActive,
  chatExpanded,
  onChatExpandedChange,
  chatScrollToMessageId,
  onChatScrollHandled,
  initiativeTokens,
  onInitiativeToggleVisibility,
  onInitiativeMove,
  onInitiativeSetCurrent,
  onInitiativeNext,
  onInitiativeRollAll,
  onInitiativeSetModifier,
  onVisibilityChange,
}: DmHudColumnProps) {
  const prefs = useDmHudPreferences(roomId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [lastSeenChatTs, setLastSeenChatTs] = useState(() => Date.now())
  const [chatDmSectionOpen, setChatDmSectionOpen] = useState(true)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearDone, setClearDone] = useState(false)
  const [dockOpen, setDockOpen] = useState(() => {
    try {
      return localStorage.getItem(`d20:dm-hud-open:${roomId}`) !== '0'
    } catch {
      return true
    }
  })
  const dialogTitleId = useId()

  const onChatSectionExpanded = useCallback((open: boolean) => {
    setChatDmSectionOpen(open)
  }, [])

  // Escuchar confirmación del servidor de que el snapshot fue borrado
  useEffect(() => {
    socket.on('snapshotCleared', () => {
      setClearDone(true)
      setClearConfirm(false)
      setTimeout(() => setClearDone(false), 3000)
    })
    return () => {
      socket.off('snapshotCleared')
    }
  }, [socket])

  const chatBadge = useMemo(() => {
    if (chatUnread <= 0) return undefined
    return chatUnread > 99 ? '99+' : chatUnread
  }, [chatUnread])

  const renderTool = useCallback(
    (id: DmHudToolId) => {
      switch (id) {
        case 'timer':
          return (
            <DmCollapsibleCard roomId={roomId} sectionId="timer" title={prefs.labels.timer}>
              <DmTurnTimerBar
                embedded
                socket={socket}
                timerActive={timerActive}
                className="w-full max-w-none shadow-md"
              />
            </DmCollapsibleCard>
          )
        case 'dice':
          return (
            <DmCollapsibleCard roomId={roomId} sectionId="dice" title={prefs.labels.dice}>
              <DicePanel socket={socket} roomState={roomState} isDm layout="dock" nestedInHud />
            </DmCollapsibleCard>
          )
        case 'mapAudio':
          return (
            <DmCollapsibleCard roomId={roomId} sectionId="mapAudio" title={prefs.labels.mapAudio}>
              <MapDmVideoAudioCard embedded socket={socket} roomState={roomState} />
            </DmCollapsibleCard>
          )
        case 'notes':
          return (
            <DmCollapsibleCard roomId={roomId} sectionId="notes" title={prefs.labels.notes}>
              <PrivateNotesPanel
                variant="dm"
                socket={socket}
                roomState={roomState}
                bySession={privateNotesDmBySession}
                open
                layout="dock"
                nestedInHud
              />
            </DmCollapsibleCard>
          )
        case 'chat':
          return (
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="chat"
              title={prefs.labels.chat}
              badge={chatBadge}
              onExpandedChange={onChatSectionExpanded}
            >
              <ChatPanel
                socket={socket}
                roomState={roomState}
                open
                readOnly={false}
                expanded={chatExpanded}
                onExpandedChange={onChatExpandedChange}
                layout="dock"
                nestedInHud
                dmSectionExpanded={chatDmSectionOpen}
                onUnreadCountChange={setChatUnread}
                viewerRole="dm"
                scrollToMessageId={chatScrollToMessageId}
                onScrollTargetHandled={onChatScrollHandled}
              />
            </DmCollapsibleCard>
          )
        default:
          return null
      }
    },
    [
      chatBadge,
      chatDmSectionOpen,
      chatExpanded,
      onChatExpandedChange,
      onChatSectionExpanded,
      prefs.labels,
      privateNotesDmBySession,
      roomId,
      roomState,
      socket,
      chatScrollToMessageId,
      onChatScrollHandled,
      timerActive,
    ],
  )

  const pendingRollCount = roomState.pendingRollRequests?.length ?? 0
  const hiddenChatUnread = useMemo(() => {
    if (dockOpen) return 0
    return roomState.chatLog.reduce((count, item) => count + (item.ts > lastSeenChatTs ? 1 : 0), 0)
  }, [dockOpen, lastSeenChatTs, roomState.chatLog])
  const menuBadgeCount = pendingRollCount + hiddenChatUnread

  useEffect(() => {
    onVisibilityChange?.(dockOpen)
    try {
      localStorage.setItem(`d20:dm-hud-open:${roomId}`, dockOpen ? '1' : '0')
    } catch {
      /* noop */
    }
  }, [dockOpen, onVisibilityChange, roomId])

  useEffect(() => {
    if (!dockOpen) return
    const newest = roomState.chatLog[0]?.ts
    if (typeof newest === 'number' && Number.isFinite(newest)) {
      setLastSeenChatTs((prev) => Math.max(prev, newest))
    } else {
      setLastSeenChatTs(Date.now())
    }
  }, [dockOpen, roomState.chatLog])

  useEffect(() => {
    if (timerActive && !dockOpen) {
      setDockOpen(true)
    }
  }, [dockOpen, timerActive])

  return (
    <>
      <div className="pointer-events-auto fixed right-2 top-[5.5rem] z-[90] sm:right-3 sm:top-24">
        <button
          type="button"
          className="vtt-hud-toggle-btn"
          onClick={() => setDockOpen((prev) => !prev)}
          aria-expanded={dockOpen}
          aria-controls="dm-hud-column"
          aria-label={dockOpen ? 'Ocultar herramientas del Narrador' : 'Mostrar herramientas del Narrador'}
        >
          <span className="vtt-hud-toggle-btn__glyph" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          Herramientas
          {menuBadgeCount > 0 ? (
            <span className="vtt-hud-toggle-badge inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-[var(--vtt-ember)] px-1 text-[0.62rem] font-bold leading-none text-white">
              {menuBadgeCount > 99 ? '99+' : menuBadgeCount}
            </span>
          ) : null}
        </button>
      </div>

      {!dockOpen ? null : (
      <div
        id="dm-hud-column"
        className="vtt-hud-column vtt-hud-column--floating fixed right-2 top-[8.15rem] z-[89] flex w-[min(17.5rem,calc(100vw-1rem))] max-h-[calc(100svh-8.2rem)] flex-col gap-1.5 overflow-y-auto pb-2 [scrollbar-gutter:stable] sm:right-3 sm:top-[8.6rem] sm:max-h-[calc(100svh-8.65rem)]"
        aria-label="Herramientas del Narrador"
      >
        <div className="sticky top-0 z-[1] flex shrink-0 items-center justify-between gap-2 bg-[var(--vtt-bg)]/80 pb-1 backdrop-blur-sm">
          {clearDone ? (
            <span className="text-[0.65rem] font-semibold text-[var(--vtt-forest)]">
              ✓ Caché borrada
            </span>
          ) : clearConfirm ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[0.65rem] text-[var(--vtt-danger-text)]">¿Confirmar?</span>
              <button
                type="button"
                className="rounded border border-[var(--vtt-danger-border)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--vtt-danger-text)] hover:bg-[var(--vtt-danger-bg)]"
                onClick={() => {
                  socket.emit('clearSessionSnapshot')
                  setClearConfirm(false)
                }}
              >
                Sí, borrar
              </button>
              <button
                type="button"
                className="rounded border border-[var(--vtt-border)] px-2 py-0.5 text-[0.65rem] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)]"
                onClick={() => setClearConfirm(false)}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              title="Borra el estado guardado en caché (Redis/disco). No afecta la sesión actual."
              className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)] hover:border-[var(--vtt-danger-border)] hover:text-[var(--vtt-danger-text)]"
              onClick={() => setClearConfirm(true)}
            >
              Borrar caché
            </button>
          )}
          <button
            type="button"
            className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] px-2.5 py-1 font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--vtt-gold)] shadow-sm hover:border-[var(--vtt-gold-dim)]"
            onClick={() => setSettingsOpen(true)}
          >
            Personalizar barra
          </button>
        </div>

        <DmCollapsibleCard roomId={roomId} sectionId="dm-reactions" title="Reacciones (pantalla)">
          <div className="pointer-events-auto flex w-full flex-col gap-1.5 px-0.5 py-1">
            <p className="px-0.5 text-[0.65rem] leading-snug text-[var(--vtt-text-muted)]">
              Misma animación grande que ven todos en la ventana (incluidos espectadores).
            </p>
            <ScreenReactionPalette socket={socket} className="w-full justify-center" />
          </div>
        </DmCollapsibleCard>

        <div className="shrink-0">
          <InitiativePanel
            placement="dmHud"
            roomId={roomId}
            initiative={roomState.initiative}
            tokens={initiativeTokens}
            isDm
            onToggleVisibility={onInitiativeToggleVisibility}
            onMove={onInitiativeMove}
            onSetCurrent={onInitiativeSetCurrent}
            onNext={onInitiativeNext}
            onRollAll={onInitiativeRollAll}
            onSetModifier={onInitiativeSetModifier}
          />
        </div>

        {pendingRollCount > 0 ? (
          <DmCollapsibleCard
            roomId={roomId}
            sectionId="roll-requests"
            title="Solicitudes de tirada"
            badge={pendingRollCount > 99 ? '99+' : pendingRollCount}
          >
            <RollRequestInbox
              embedded
              socket={socket}
              requests={roomState.pendingRollRequests ?? []}
            />
          </DmCollapsibleCard>
        ) : null}

        <DmCollapsibleCard roomId={roomId} sectionId="image-reveal" title="Revelar imagen (URL)">
          <ImageRevealTool socket={socket} variant="dm" embedded />
        </DmCollapsibleCard>

        {!roomState.activePoll ? (
          <>
            <DmCollapsibleCard roomId={roomId} sectionId="poll-new" title="Votación grupal">
              <div className="px-2 py-1">
                <button
                  type="button"
                  className="w-full rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] px-3 py-2 text-left font-vtt-display text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] hover:border-[var(--vtt-gold-dim)]"
                  onClick={() => setPollModalOpen(true)}
                >
                  Nueva votación grupal
                </button>
              </div>
            </DmCollapsibleCard>
            <PollStartModal
              open={pollModalOpen}
              onClose={() => setPollModalOpen(false)}
              socket={socket}
            />
          </>
        ) : null}

        {prefs.visibleOrder.map((id) => (
          <div key={id} className="shrink-0">
            {renderTool(id)}
          </div>
        ))}
      </div>
      )}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="vtt-surface vtt-glow-border max-h-[min(32rem,90svh)] w-full max-w-md overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={dialogTitleId}
              className="font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)]"
            >
              Herramientas del Narrador
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--vtt-text-muted)]">
              Activa o quita bloques y cambia el orden en la columna derecha (temporizador, audio
              del mapa, dados, notas y chat).
            </p>

            <div className="mt-4 space-y-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
                Mostrar u ocultar
              </p>
              {prefs.allIds.map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[var(--vtt-border)]"
                    checked={!prefs.hidden.includes(id)}
                    onChange={(e) => prefs.setHiddenTool(id, !e.target.checked)}
                  />
                  <span>{prefs.labels[id]}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
                Orden (arriba → abajo)
              </p>
              <ul className="space-y-1">
                {prefs.order.map((id, idx) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--vtt-text)]">
                      <span className="font-mono text-[0.65rem] text-[var(--vtt-text-muted)]">
                        {idx + 1}.
                      </span>{' '}
                      {prefs.labels[id]}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded border border-[var(--vtt-border)] px-2 py-0.5 text-xs text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] disabled:opacity-40"
                        disabled={idx === 0}
                        onClick={() => prefs.moveInOrder(id, 'up')}
                        aria-label={`Subir ${prefs.labels[id]}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[var(--vtt-border)] px-2 py-0.5 text-xs text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] disabled:opacity-40"
                        disabled={idx >= prefs.order.length - 1}
                        onClick={() => prefs.moveInOrder(id, 'down')}
                        aria-label={`Bajar ${prefs.labels[id]}`}
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--vtt-border-subtle)] pt-4">
              <button
                type="button"
                className="vtt-btn-secondary text-xs"
                onClick={prefs.resetDefaults}
              >
                Restablecer orden por defecto
              </button>
              <button
                type="button"
                className="vtt-btn-primary ml-auto text-xs"
                onClick={() => setSettingsOpen(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
