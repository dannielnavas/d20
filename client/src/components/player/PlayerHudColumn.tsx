import { useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState, Token } from '../../types/room'
import type { PrivateNotesPair } from '../../types/private-notes'
import { ChatPanel } from '../chat/ChatPanel'
import { PrivateNotesPanel } from '../chat/PrivateNotesPanel'
import { DicePanel } from '../dice/DicePanel'
import { InitiativePanel } from '../initiative/InitiativePanel'
import { ScreenReactionPalette } from '../reactions/ScreenReactionPalette'
import { ImageRevealTool } from '../reveal/ImageRevealTool'
import { DmCollapsibleCard } from '../dm/DmCollapsibleCard'

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
}: PlayerHudColumnProps) {
  const [chatUnread, setChatUnread] = useState(0)
  const [chatDmSectionOpen, setChatDmSectionOpen] = useState(true)

  const chatBadge = chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined

  return (
    <div
      className="fixed right-3 top-[5.5rem] z-[89] flex w-[min(22rem,calc(100vw-1.5rem))] max-h-[calc(100svh-5.25rem)] flex-col gap-2 overflow-y-auto pb-2 [scrollbar-gutter:stable] sm:top-24"
      aria-label="Herramientas del jugador"
    >
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

      <DmCollapsibleCard roomId={roomId} sectionId="player-chat" title="Chat y Actividad" badge={chatBadge} onExpandedChange={setChatDmSectionOpen}>
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

      <DmCollapsibleCard roomId={roomId} sectionId="player-notes" title="Notas Privadas (DM)">
         <PrivateNotesPanel
            variant="player"
            socket={socket}
            pair={privateNotesPlayerPair}
            open
            layout="dock"
            nestedInHud
         />
      </DmCollapsibleCard>

      <DmCollapsibleCard roomId={roomId} sectionId="player-tools" title="Reacciones e Imagen" defaultExpanded={false}>
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
