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
  initiativeTokens: Token[]
  playerSessionId: string
  canRequestRoll: boolean
  currentToken: Token | null
}

export function PlayerHudColumn({
  roomId,
  socket,
  roomState,
  privateNotesPlayerPair,
  chatExpanded,
  onChatExpandedChange,
  initiativeTokens,
  playerSessionId,
  canRequestRoll,
  currentToken,
}: PlayerHudColumnProps) {
  const [chatUnread, setChatUnread] = useState(0)
  const [chatDmSectionOpen, setChatDmSectionOpen] = useState(true)
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

  return (
    <div
      className="fixed right-3 top-[5.5rem] z-[89] flex w-[min(22rem,calc(100vw-1.5rem))] max-h-[calc(100svh-5.25rem)] flex-col gap-2 overflow-y-auto pb-2 [scrollbar-gutter:stable] sm:top-24"
      aria-label="Herramientas del jugador"
    >
      {currentToken ? (
        <DmCollapsibleCard roomId={roomId} sectionId="player-character" title="Tu personaje">
          <div className="space-y-3 px-2 py-2">
            <div className="flex items-center gap-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] px-3 py-3">
              <div
                className="h-14 w-14 overflow-hidden rounded-[1rem] border-[3px] bg-[var(--vtt-surface)]"
                style={{ borderColor: frameColorDraft }}
              >
                {avatarDraft ? (
                  <img src={avatarDraft} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-vtt-display text-sm text-[var(--vtt-gold)]">
                    {currentToken.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-vtt-display text-sm text-[var(--vtt-text)]">
                  {currentToken.name}
                </p>
                <p className="text-[0.72rem] text-[var(--vtt-text-muted)]">
                  HP {hpCurrentDraft}/{hpMaxDraft} · +{hpTempDraft}
                </p>
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

      <DmCollapsibleCard roomId={roomId} sectionId="player-dice" title="Dados">
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

      <DmCollapsibleCard roomId={roomId} sectionId="player-initiative" title="Iniciativa">
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
        />
      </DmCollapsibleCard>

      <DmCollapsibleCard roomId={roomId} sectionId="player-notes" title="Notas Privadas (Narrador)">
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
  )
}
