import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { DEFAULT_TOKEN_FRAME_COLOR, TOKEN_FRAME_COLORS } from '../../config/tokenFrameColors'
import type { PrivateNotesPair } from '../../types/private-notes'
import type { RoomState, Token } from '../../types/room'
import { ChatPanel } from '../chat/ChatPanel'
import { PrivateNotesPanel } from '../chat/PrivateNotesPanel'
import { DicePanel } from '../dice/DicePanel'
import { DmCollapsibleCard } from '../dm/DmCollapsibleCard'
import { InitiativePanel } from '../initiative/InitiativePanel'
import { ScreenReactionPalette } from '../reactions/ScreenReactionPalette'
import { ImageRevealTool } from '../reveal/ImageRevealTool'

export type PlayerHudColumnProps = {
  roomId: string
  socket: Socket
  roomState: RoomState
  privateNotesPlayerPair: PrivateNotesPair | null
  chatExpanded: boolean
  onChatExpandedChange: (v: boolean) => void
  chatScrollToMessageId?: string | null
  onChatScrollHandled?: (messageId: string) => void
  initiativeTokens: Token[]
  playerSessionId: string
  canRequestRoll: boolean
  currentToken: Token | null
  onVisibilityChange?: (visible: boolean) => void
}

export function PlayerHudColumn({
  roomId,
  socket,
  roomState,
  privateNotesPlayerPair,
  chatExpanded,
  onChatExpandedChange,
  chatScrollToMessageId,
  onChatScrollHandled,
  initiativeTokens,
  playerSessionId,
  canRequestRoll,
  currentToken,
  onVisibilityChange,
}: PlayerHudColumnProps) {
  const [chatUnread, setChatUnread] = useState(0)
  const [lastSeenChatTs, setLastSeenChatTs] = useState(() => Date.now())
  const [chatDmSectionOpen, setChatDmSectionOpen] = useState(true)
  const [dockOpen, setDockOpen] = useState(() => {
    try {
      return localStorage.getItem(`d20:player-hud-open:${roomId}`) !== '0'
    } catch {
      return true
    }
  })
  const [avatarDraft, setAvatarDraft] = useState('')
  const [frameColorDraft, setFrameColorDraft] = useState<string>(DEFAULT_TOKEN_FRAME_COLOR)
  const [hpCurrentDraft, setHpCurrentDraft] = useState(0)
  const [hpMaxDraft, setHpMaxDraft] = useState(0)
  const [hpTempDraft, setHpTempDraft] = useState(0)

  useEffect(() => {
    setAvatarDraft(currentToken?.img ?? '')
    setFrameColorDraft(currentToken?.frameColor ?? DEFAULT_TOKEN_FRAME_COLOR)
    setHpCurrentDraft(currentToken?.hitPointsCurrent ?? 0)
    setHpMaxDraft(currentToken?.hitPointsMax ?? 0)
    setHpTempDraft(currentToken?.hitPointsTemp ?? 0)
  }, [currentToken])

  const saveIdentity = () => {
    if (!currentToken) return
    socket.emit('tokenPatch', {
      tokenId: currentToken.id,
      img: avatarDraft,
      frameColor: frameColorDraft,
      hitPointsCurrent: hpCurrentDraft,
      hitPointsMax: hpMaxDraft,
      hitPointsTemp: hpTempDraft,
    })
  }

  const chatBadge = chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined
  const hiddenChatUnread = dockOpen
    ? 0
    : roomState.chatLog.reduce((count, item) => count + (item.ts > lastSeenChatTs ? 1 : 0), 0)
  const menuBadgeCount = hiddenChatUnread

  useEffect(() => {
    onVisibilityChange?.(dockOpen)
    try {
      localStorage.setItem(`d20:player-hud-open:${roomId}`, dockOpen ? '1' : '0')
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

  return (
    <>
      <div className="pointer-events-auto fixed right-2 top-[5.5rem] z-[90] sm:right-3 sm:top-24">
        <button
          type="button"
          className="vtt-hud-toggle-btn d20-player-hud-toggle"
          onClick={() => setDockOpen((prev) => !prev)}
          aria-expanded={dockOpen}
          aria-controls="player-hud-column"
          aria-label={dockOpen ? 'Ocultar herramientas del jugador' : 'Mostrar herramientas del jugador'}
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
          id="player-hud-column"
          className="vtt-hud-column vtt-hud-column--floating d20-player-hud-column fixed right-2 top-[8.15rem] z-[89] flex w-[min(17.5rem,calc(100vw-1rem))] max-h-[calc(100svh-8.2rem)] flex-col gap-1.5 overflow-y-auto pb-2 [scrollbar-gutter:stable] sm:right-3 sm:top-[8.6rem] sm:max-h-[calc(100svh-8.65rem)]"
          aria-label="Herramientas del jugador"
        >
          {/* Role badge del jugador */}
          <div className="sticky top-0 z-[1] shrink-0 bg-[var(--vtt-bg)]/90 pb-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#f59e0b]/15 text-[0.7rem] text-[#f59e0b]" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2a2 2 0 100 4 2 2 0 000-4zm-4 5.5A1.5 1.5 0 015.5 6h5A1.5 1.5 0 0112 7.5v.5c0 2.21-1.79 4-4 4S4 10.21 4 8v-.5z" fill="currentColor"/></svg>
              </span>
              <span className="font-vtt-display text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#f59e0b]/70">Jugador</span>
            </div>
          </div>
      {currentToken ? (
        <DmCollapsibleCard
          roomId={roomId}
          sectionId="player-character"
          title="Tu personaje"
          iconAccent="indigo"
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          }
        >
          <div className="space-y-3 px-2 py-2">
            {/* Tarjeta de identidad */}
            <div className="d20-player-identity-card">
              <div
                className="d20-player-avatar"
                style={{ '--avatar-ring': frameColorDraft } as React.CSSProperties}
              >
                {avatarDraft ? (
                  <img src={avatarDraft} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--vtt-text)]">
                    {currentToken.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--vtt-text)] truncate">
                  {currentToken.name}
                </p>
                {/* HP bar gradiente */}
                <div className="mt-1.5">
                  <div className="d20-hp-bar-track">
                    <div
                      className="d20-hp-bar-fill"
                      style={{
                        width: hpMaxDraft > 0 ? `${Math.max(0, Math.min(100, (hpCurrentDraft / hpMaxDraft) * 100))}%` : '0%',
                      }}
                    />
                    {hpTempDraft > 0 && (
                      <div
                        className="d20-hp-bar-temp"
                        style={{
                          width: hpMaxDraft > 0 ? `${Math.min(20, (hpTempDraft / hpMaxDraft) * 100)}%` : '0%',
                        }}
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.65rem] text-[var(--vtt-text-muted)]">
                    {hpCurrentDraft}/{hpMaxDraft} HP{hpTempDraft > 0 ? ` · +${hpTempDraft} temp` : ''}
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-[0.68rem] text-[var(--vtt-text-muted)]">
              Imagen del personaje
              <input
                type="url"
                className="vtt-input mt-1 text-xs"
                value={avatarDraft}
                onChange={(e) => setAvatarDraft(e.target.value)}
                placeholder="https://…"
                maxLength={2000}
              />
            </label>

            <div>
              <p className="text-[0.68rem] text-[var(--vtt-text-muted)]">Color del marco</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOKEN_FRAME_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition ${frameColorDraft === option.value ? 'scale-110 border-[var(--vtt-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : 'border-transparent opacity-85 hover:opacity-100'}`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                    aria-label={`Seleccionar color de marco: ${option.label}`}
                    aria-pressed={frameColorDraft === option.value}
                    onClick={() => setFrameColorDraft(option.value)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-[0.68rem] text-[var(--vtt-text-muted)]">
                Actuales
                <input
                  type="number"
                  min={0}
                  className="vtt-input mt-1 text-xs"
                  value={hpCurrentDraft}
                  onChange={(e) => setHpCurrentDraft(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className="text-[0.68rem] text-[var(--vtt-text-muted)]">
                Máximos
                <input
                  type="number"
                  min={0}
                  className="vtt-input mt-1 text-xs"
                  value={hpMaxDraft}
                  onChange={(e) => setHpMaxDraft(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className="text-[0.68rem] text-[var(--vtt-text-muted)]">
                Temporales
                <input
                  type="number"
                  min={0}
                  className="vtt-input mt-1 text-xs"
                  value={hpTempDraft}
                  onChange={(e) => setHpTempDraft(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
            </div>

            <button type="button" className="vtt-btn-primary w-full text-xs" onClick={saveIdentity}>
              Guardar retrato y estado
            </button>
          </div>
        </DmCollapsibleCard>
      ) : null}

      <DmCollapsibleCard
        roomId={roomId}
        sectionId="player-dice"
        title="Dados"
        iconAccent="amber"
        icon={
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>
        }
      >
        <DicePanel
          socket={socket}
          roomState={roomState}
          isDm={false}
          playerSessionId={playerSessionId}
          canRequestRoll={canRequestRoll}
          layout="dock"
          nestedInHud
        />
      </DmCollapsibleCard>

      <DmCollapsibleCard
        roomId={roomId}
        sectionId="player-initiative"
        title="Iniciativa"
        iconAccent="rose"
        icon={
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.2 6.2l4-.6L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        }
      >
        <InitiativePanel
          placement="inline"
          initiative={roomState.initiative}
          tokens={initiativeTokens}
          isDm={false}
          onToggleVisibility={() => {}}
          onMove={() => {}}
          onSetCurrent={() => {}}
          onNext={() => {}}
          onRollAll={() => {}}
          onSetModifier={() => {}}
        />
      </DmCollapsibleCard>

      <DmCollapsibleCard
        roomId={roomId}
        sectionId="player-chat"
        title="Chat y Actividad"
        badge={chatBadge}
        iconAccent="indigo"
        icon={
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 2.5V11H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
        }
        onExpandedChange={setChatDmSectionOpen}
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
          viewerRole="player"
          viewerSessionId={playerSessionId}
          scrollToMessageId={chatScrollToMessageId}
          onScrollTargetHandled={onChatScrollHandled}
        />
      </DmCollapsibleCard>

      <DmCollapsibleCard
        roomId={roomId}
        sectionId="player-notes"
        title="Notas Privadas (Narrador)"
        iconAccent="muted"
        icon={
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        }
      >
        <PrivateNotesPanel
          variant="player"
          socket={socket}
          pair={privateNotesPlayerPair}
          open
          layout="dock"
          nestedInHud
        />
      </DmCollapsibleCard>

      <DmCollapsibleCard
        roomId={roomId}
        sectionId="player-tools"
        title="Reacciones e Imagen"
        iconAccent="violet"
        icon={
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM5.5 6a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM5.5 9.5C6 10.5 7 11.5 8 11.5s2-1 2.5-2h-5z" fill="currentColor"/></svg>
        }
        defaultExpanded={false}
      >
        <div className="mt-2 space-y-4 px-2 py-2">
          <div>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
              Reacciones rápidas
            </p>
            <ScreenReactionPalette socket={socket} />
          </div>
          {roomState.settings.playersCanRevealImage ? (
            <div>
              <ImageRevealTool socket={socket} variant="player" embedded />
            </div>
          ) : null}
        </div>
      </DmCollapsibleCard>
        </div>
      )}
    </>
  )
}
