import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { PrivateNotesPair } from '../../types/private-notes'
import type { RoomState } from '../../types/room'

type PrivateNotesPanelProps =
  | {
      variant: 'player'
      socket: Socket
      pair: PrivateNotesPair | null
      open: boolean
    }
  | {
      variant: 'dm'
      socket: Socket
      roomState: RoomState
      bySession: Record<string, PrivateNotesPair>
      open: boolean
      /** `dock`: columna del DM; `floating`: esquina inferior derecha (por defecto). */
      layout?: 'floating' | 'dock'
      /** Dentro de `DmCollapsibleCard`: sin cabecera duplicada. */
      nestedInHud?: boolean
    }

export function PrivateNotesPanel(props: PrivateNotesPanelProps) {
  const { socket, open } = props
  const [expanded, setExpanded] = useState(true)

  if (!open) return null

  if (props.variant === 'player') {
    return (
      <PlayerPrivateNotes
        socket={socket}
        pair={props.pair}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
      />
    )
  }

  return (
    <DmPrivateNotes
      socket={socket}
      roomState={props.roomState}
      bySession={props.bySession}
      expanded={expanded}
      onToggleExpand={() => setExpanded((e) => !e)}
      layout={props.layout ?? 'floating'}
      nestedInHud={props.nestedInHud ?? false}
    />
  )
}

function PlayerPrivateNotes({
  socket,
  pair,
  expanded,
  onToggleExpand,
}: {
  socket: Socket
  pair: PrivateNotesPair | null
  expanded: boolean
  onToggleExpand: () => void
}) {
  const dmText = pair?.dm ?? ''
  const [draftPlayer, setDraftPlayer] = useState(pair?.player ?? '')

  useEffect(() => {
    setDraftPlayer(pair?.player ?? '')
  }, [pair?.player])

  const savePlayer = useCallback(() => {
    socket.emit('privateNotesSet', { player: draftPlayer })
  }, [draftPlayer, socket])

  return (
    <section
      className="fixed bottom-3 right-3 z-[85] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm"
      aria-label="Notas privadas con el director de juego"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-[var(--vtt-border-subtle)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)]"
        onClick={onToggleExpand}
        aria-expanded={expanded}
      >
        Notas privadas (DM)
        <span className="text-[var(--vtt-text-muted)]">{expanded ? '−' : '+'}</span>
      </button>
      {expanded ? (
        <div className="flex max-h-[min(22rem,50svh)] flex-col gap-2 overflow-y-auto p-3 text-sm">
          <div>
            <label
              htmlFor="vtt-private-from-dm"
              className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]"
            >
              Del director
            </label>
            <textarea
              id="vtt-private-from-dm"
              readOnly
              value={dmText}
              rows={4}
              className="vtt-input min-h-[5rem] w-full resize-y text-sm text-[var(--vtt-text-muted)]"
              aria-readonly="true"
            />
          </div>
          <div>
            <label
              htmlFor="vtt-private-to-dm"
              className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]"
            >
              Para el director
            </label>
            <textarea
              id="vtt-private-to-dm"
              value={draftPlayer}
              onChange={(e) => setDraftPlayer(e.target.value)}
              rows={4}
              maxLength={6000}
              className="vtt-input min-h-[5rem] w-full resize-y text-sm"
              placeholder="Escribe algo que solo verá el director…"
            />
          </div>
          <button type="button" className="vtt-btn-primary w-full text-xs" onClick={savePlayer}>
            Guardar tu nota
          </button>
        </div>
      ) : null}
    </section>
  )
}

function DmPrivateNotes({
  socket,
  roomState,
  bySession,
  expanded,
  onToggleExpand,
  layout,
  nestedInHud,
}: {
  socket: Socket
  roomState: RoomState
  bySession: Record<string, PrivateNotesPair>
  expanded: boolean
  onToggleExpand: () => void
  layout: 'floating' | 'dock'
  nestedInHud: boolean
}) {
  const options = useMemo(() => {
    const seen = new Set<string>()
    const fromTokens: { sid: string; label: string }[] = []
    for (const sc of roomState.scenes) {
      for (const t of sc.tokens) {
        if (t.type !== 'pc' || !t.claimedBy || seen.has(t.claimedBy)) continue
        seen.add(t.claimedBy)
        fromTokens.push({ sid: t.claimedBy, label: t.name })
      }
    }
    const labelBySid = new Map(fromTokens.map((x) => [x.sid, x.label]))
    const ids = new Set<string>([...Object.keys(bySession), ...fromTokens.map((x) => x.sid)])
    return [...ids].map((sid) => ({
      sid,
      label: labelBySid.get(sid) ?? `Sesión ${sid.slice(0, 8)}…`,
    }))
  }, [bySession, roomState.scenes])

  const [selectedSid, setSelectedSid] = useState('')
  useEffect(() => {
    if (options.length === 0) {
      setSelectedSid('')
      return
    }
    setSelectedSid((cur) => (cur && options.some((o) => o.sid === cur) ? cur : options[0].sid))
  }, [options])

  const entry = selectedSid
    ? (bySession[selectedSid] ?? { dm: '', player: '' })
    : { dm: '', player: '' }
  const [draftDm, setDraftDm] = useState(entry.dm)

  useEffect(() => {
    setDraftDm(entry.dm)
  }, [entry.dm, selectedSid])

  const saveDm = useCallback(() => {
    if (!selectedSid) return
    socket.emit('privateNotesSet', { playerSessionId: selectedSid, dm: draftDm })
  }, [draftDm, selectedSid, socket])

  const shellClass =
    layout === 'dock' && nestedInHud
      ? 'relative z-auto flex w-full flex-col'
      : layout === 'dock'
        ? 'relative z-auto flex w-full flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm'
        : 'fixed bottom-3 right-3 z-[85] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm'

  const showInnerHeader = !(layout === 'dock' && nestedInHud)
  const bodyOpen = nestedInHud ? true : expanded

  return (
    <section className={shellClass} aria-label="Notas privadas con jugadores">
      {showInnerHeader ? (
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-[var(--vtt-border-subtle)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)]"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          Notas privadas
          <span className="text-[var(--vtt-text-muted)]">{expanded ? '−' : '+'}</span>
        </button>
      ) : null}
      {bodyOpen ? (
        <div className="flex max-h-[min(24rem,55svh)] flex-col gap-2 overflow-y-auto p-3 text-sm">
          {options.length === 0 ? (
            <p className="text-xs text-[var(--vtt-text-muted)]">
              Cuando un jugador entre con su enlace, podrás elegir su sesión aquí.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="vtt-private-session" className="sr-only">
                  Jugador
                </label>
                <select
                  id="vtt-private-session"
                  className="vtt-input w-full text-sm"
                  value={selectedSid}
                  onChange={(e) => setSelectedSid(e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o.sid} value={o.sid}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="vtt-dm-private-msg"
                  className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]"
                >
                  Tu mensaje al jugador
                </label>
                <textarea
                  id="vtt-dm-private-msg"
                  value={draftDm}
                  onChange={(e) => setDraftDm(e.target.value)}
                  rows={4}
                  maxLength={6000}
                  className="vtt-input min-h-[5rem] w-full resize-y text-sm"
                  placeholder="Solo lo verá ese jugador…"
                />
              </div>
              <div>
                <label
                  htmlFor="vtt-dm-private-from-player"
                  className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]"
                >
                  Lo que escribió el jugador
                </label>
                <textarea
                  id="vtt-dm-private-from-player"
                  readOnly
                  value={entry.player}
                  rows={4}
                  className="vtt-input min-h-[5rem] w-full resize-y text-sm text-[var(--vtt-text-muted)]"
                  aria-readonly="true"
                />
              </div>
              <button type="button" className="vtt-btn-primary w-full text-xs" onClick={saveDm}>
                Guardar mensaje al jugador
              </button>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
