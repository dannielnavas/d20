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

  // Escape to close settings
  useEffect(() => {
    if (!settingsOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen])
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
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="timer"
              title={prefs.labels.timer}
              iconAccent="rose"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 6v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5.5 2h5M8 2v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              }
            >
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
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="dice"
              title={prefs.labels.dice}
              iconAccent="amber"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>
              }
            >
              <DicePanel socket={socket} roomState={roomState} isDm layout="dock" nestedInHud />
            </DmCollapsibleCard>
          )
        case 'mapAudio':
          return (
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="mapAudio"
              title={prefs.labels.mapAudio}
              iconAccent="sky"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6v4M5.5 4v8M8 2v12M10.5 5v6M13 7v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              }
            >
              <MapDmVideoAudioCard embedded socket={socket} roomState={roomState} />
            </DmCollapsibleCard>
          )
        case 'notes':
          return (
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="notes"
              title={prefs.labels.notes}
              iconAccent="muted"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              }
            >
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
              iconAccent="indigo"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 2.5V11H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              }
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
          className="vtt-hud-toggle-btn hover:scale-[1.02] active:scale-95 transition-transform duration-200"
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
        className="vtt-hud-column vtt-hud-column--floating fixed right-2 top-[8.15rem] z-[89] flex w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100svh-8.2rem)] flex-col gap-2.5 overflow-y-auto pb-2 [scrollbar-gutter:stable] sm:right-3 sm:top-[8.6rem] sm:max-h-[calc(100svh-8.65rem)]"
        aria-label="Herramientas del Narrador"
      >
        {/* Cabecera del panel */}
        <div className="sticky top-0 z-[1] shrink-0 bg-[var(--vtt-bg)]/90 pb-1 backdrop-blur-md">
          {/* Role badge */}
          <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#6366f1]/15 text-[0.7rem] text-[#818cf8]" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2a2 2 0 100 4 2 2 0 000-4zm-4 5.5A1.5 1.5 0 015.5 6h5A1.5 1.5 0 0112 7.5v.5c0 2.21-1.79 4-4 4S4 10.21 4 8v-.5z" fill="currentColor"/></svg>
            </span>
            <span className="font-vtt-display text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#818cf8]/70">Narrador</span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-1.5">
            {clearDone ? (
              <span className="flex items-center gap-1 rounded-[var(--vtt-radius-sm)] bg-[#34d399]/10 px-2.5 py-1.5 text-[0.62rem] font-semibold text-[#34d399]">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Caché borrada
              </span>
            ) : clearConfirm ? (
              <span className="flex flex-1 items-center gap-1.5">
                <span className="text-[0.62rem] text-[var(--vtt-danger-text)]">¿Confirmar?</span>
                <button
                  type="button"
                  className="rounded border border-[var(--vtt-danger-border)] px-2 py-0.5 text-[0.62rem] font-semibold text-[var(--vtt-danger-text)] hover:bg-[var(--vtt-danger-bg)]"
                  onClick={() => { socket.emit('clearSessionSnapshot'); setClearConfirm(false) }}
                >
                  Sí, borrar
                </button>
                <button
                  type="button"
                  className="rounded border border-[var(--vtt-border)] px-2 py-0.5 text-[0.62rem] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)]"
                  onClick={() => setClearConfirm(false)}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                title="Borra el estado guardado en caché (Redis/disco). No afecta la sesión actual."
                className="group flex flex-1 items-center justify-center gap-1.5 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-2 py-1.5 text-[0.62rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)] transition-all hover:border-[var(--vtt-danger-border)] hover:text-[var(--vtt-danger-text)]"
                onClick={() => setClearConfirm(true)}
              >
                <svg className="opacity-60 group-hover:opacity-100" width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4M6 6.5v4M8 6.5v4M3.5 4l.5 7.5A.5.5 0 004.5 12h5a.5.5 0 00.5-.5L10.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Borrar caché
              </button>
            )}
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--vtt-radius-sm)] border border-[#6366f1]/30 bg-[#6366f1]/10 px-2 py-1.5 font-vtt-display text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#818cf8] transition-all hover:border-[#6366f1]/50 hover:bg-[#6366f1]/15 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
              onClick={() => setSettingsOpen(true)}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 9a2 2 0 100-4 2 2 0 000 4zM1.5 7c0-.6.08-1.2.22-1.75l-1.1-.95a6.5 6.5 0 000 5.4l1.1-.95A5.5 5.5 0 011.5 7zm11 0c0 .6-.08 1.2-.22 1.75l1.1.95a6.5 6.5 0 000-5.4l-1.1.95c.14.55.22 1.15.22 1.75zM5.6 1.3l-.5 1.4A5.5 5.5 0 003.2 4L1.7 3.7a6.5 6.5 0 00-1 1.73l1.3.57A5.5 5.5 0 001.5 7H0a6.5 6.5 0 001.3 3.88l1.04-.9A5.5 5.5 0 003.2 10l.5 1.4A6.5 6.5 0 007 12.5a6.5 6.5 0 003.3-.9l-.5-1.4a5.5 5.5 0 001.5-1.3l1.04.9A6.5 6.5 0 0014 7h-1.5a5.5 5.5 0 00-.53-1.6l1.3-.57a6.5 6.5 0 00-1-1.73L10.8 3.4A5.5 5.5 0 009.4 2.7l-.5-1.4A6.5 6.5 0 007 1a6.5 6.5 0 00-1.4.3z" fill="currentColor" fillOpacity=".85"/></svg>
              Personalizar
            </button>
          </div>
        </div>

        <DmCollapsibleCard
          roomId={roomId}
          sectionId="dm-reactions"
          title="Reacciones (pantalla)"
          iconAccent="violet"
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM5.5 6a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM5.5 9.5C6 10.5 7 11.5 8 11.5s2-1 2.5-2h-5z" fill="currentColor"/></svg>
          }
        >
          <div className="pointer-events-auto flex w-full flex-col gap-1.5 px-2 py-2">
            <p className="text-[0.64rem] leading-snug text-[var(--vtt-text-muted)]">
              Animación visible para todos en pantalla.
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
            iconAccent="amber"
            icon={
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor"/><circle cx="10.5" cy="5.5" r="1" fill="currentColor"/></svg>
            }
          >
            <RollRequestInbox
              embedded
              socket={socket}
              requests={roomState.pendingRollRequests ?? []}
            />
          </DmCollapsibleCard>
        ) : null}

        <DmCollapsibleCard
          roomId={roomId}
          sectionId="image-reveal"
          title="Revelar imagen (URL)"
          iconAccent="sky"
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 10l3.5-3.5L8 9.5 10.5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/></svg>
          }
        >
          <ImageRevealTool socket={socket} variant="dm" embedded />
        </DmCollapsibleCard>

        {!roomState.activePoll ? (
          <>
            <DmCollapsibleCard
              roomId={roomId}
              sectionId="poll-new"
              title="Votación grupal"
              iconAccent="emerald"
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 11h3v2H2v-2zM6.5 7h3v6h-3V7zM11 4h3v9h-3V4z" fill="currentColor"/></svg>
              }
            >
              <div className="px-2 py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--vtt-radius-sm)] border border-[#34d399]/25 bg-[#34d399]/8 px-3 py-2 font-vtt-display text-xs font-semibold uppercase tracking-wide text-[#34d399] transition-all hover:border-[#34d399]/40 hover:bg-[#34d399]/12"
                  onClick={() => setPollModalOpen(true)}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center transition-opacity"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="vtt-surface vtt-glow-border max-h-[min(32rem,90svh)] w-full max-w-md overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] p-5 shadow-xl transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2
                  id={dialogTitleId}
                  className="font-vtt-display text-base font-semibold tracking-wide text-[var(--vtt-gold)]"
                >
                  Herramientas del Narrador
                </h2>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--vtt-text-muted)]">
                  Activa o quita bloques y cambia el orden en la columna derecha.
                </p>
              </div>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--vtt-text-muted)] transition-colors hover:bg-[var(--vtt-surface-warm)] hover:text-[var(--vtt-text)]"
                onClick={() => setSettingsOpen(false)}
                aria-label="Cerrar opciones"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <fieldset className="mt-5 rounded-lg border border-[var(--vtt-border-subtle)] p-3 bg-[var(--vtt-surface-warm)]/30">
              <legend className="px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
                Mostrar u ocultar
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {prefs.allIds.map((id) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--vtt-border)]"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-[var(--vtt-border)] text-[#6366f1] focus:ring-[#6366f1]"
                      checked={!prefs.hidden.includes(id)}
                      onChange={(e) => prefs.setHiddenTool(id, !e.target.checked)}
                    />
                    <span className="truncate">{prefs.labels[id]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5 rounded-lg border border-[var(--vtt-border-subtle)] p-3 bg-[var(--vtt-surface-warm)]/30">
              <legend className="px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
                Orden (arriba → abajo)
              </legend>
              <ul className="mt-2 space-y-1.5">
                {prefs.order.map((id, idx) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-2.5 py-2 text-sm transition-colors hover:border-[var(--vtt-border)]"
                  >
                    <span className="min-w-0 truncate text-[var(--vtt-text)]">
                      <span className="font-mono text-[0.65rem] text-[var(--vtt-text-muted)] mr-1.5 opacity-70">
                        {idx + 1}.
                      </span>
                      {prefs.labels[id]}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] text-xs text-[var(--vtt-text-muted)] transition-colors hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-gold)] disabled:opacity-30 disabled:hover:border-[var(--vtt-border-subtle)] disabled:hover:text-[var(--vtt-text-muted)]"
                        disabled={idx === 0}
                        onClick={() => prefs.moveInOrder(id, 'up')}
                        aria-label={`Subir ${prefs.labels[id]}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 13V1M1 7l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] text-xs text-[var(--vtt-text-muted)] transition-colors hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-gold)] disabled:opacity-30 disabled:hover:border-[var(--vtt-border-subtle)] disabled:hover:text-[var(--vtt-text-muted)]"
                        disabled={idx >= prefs.order.length - 1}
                        onClick={() => prefs.moveInOrder(id, 'down')}
                        aria-label={`Bajar ${prefs.labels[id]}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1v12M1 7l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </fieldset>

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
