import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'
import { filterMentionTargets, getMentionTargetsFromRoom } from '../../utils/chatMentions'

export type ChatPanelProps = {
  socket: Socket
  roomState: RoomState
  /** Mostrar panel (p. ej. cuando hay mapa visible). */
  open: boolean
  /** Espectador: ver mensajes y actividad pero no escribir. */
  readOnly?: boolean
  /** Panel de mensajes desplegado (false = solo barra superior: “chat cerrado”). */
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  /** `dock`: columna del DM; `floating`: esquina inferior izquierda (por defecto). */
  layout?: 'floating' | 'dock'
  /** Dentro de `DmCollapsibleCard`: sin cabecera propia; el colapso lo controla la tarjeta. */
  nestedInHud?: boolean
  /** Si el bloque del HUD está expandido (solo con `nestedInHud`, para no leídos). */
  dmSectionExpanded?: boolean
  onUnreadCountChange?: (count: number) => void
}

function stripUnreadTabPrefix(title: string): string {
  return title.replace(/^\(\d+\)\s+/, '')
}

export function ChatPanel({
  socket,
  roomState,
  open,
  readOnly = false,
  expanded,
  onExpandedChange,
  layout = 'floating',
  nestedInHud = false,
  dmSectionExpanded = true,
  onUnreadCountChange,
}: ChatPanelProps) {
  const nestedDock = nestedInHud && layout === 'dock'
  /** Panel visible para el usuario (barra flotante o tarjeta del HUD abierta). */
  const openForReading = nestedDock ? dmSectionExpanded : expanded

  /** Umbral: mensajes con `ts` estrictamente mayor cuentan como no leídos si el panel está cerrado. */
  const [lastReadChatTs, setLastReadChatTs] = useState(() => Date.now())

  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionHighlight, setMentionHighlight] = useState(0)

  const targets = useMemo(() => getMentionTargetsFromRoom(roomState), [roomState])
  const mentionChoices = useMemo(
    () => filterMentionTargets(targets, mentionFilter),
    [targets, mentionFilter],
  )

  const chatLog = roomState.chatLog

  // Con el panel abierto, los mensajes actuales se consideran leídos (incluye nuevos mientras miras).
  useEffect(() => {
    if (!openForReading) return
    const newest = chatLog[0]?.ts
    if (typeof newest === 'number' && Number.isFinite(newest)) {
      setLastReadChatTs((prev) => Math.max(prev, newest))
    } else {
      setLastReadChatTs(Date.now())
    }
  }, [openForReading, chatLog])

  const unreadCount = useMemo(() => {
    if (openForReading) return 0
    return chatLog.reduce((n, m) => n + (m.ts > lastReadChatTs ? 1 : 0), 0)
  }, [openForReading, lastReadChatTs, chatLog])

  useEffect(() => {
    onUnreadCountChange?.(unreadCount)
  }, [onUnreadCountChange, unreadCount])

  const baseDocumentTitleRef = useRef<string | null>(null)
  useEffect(() => {
    if (baseDocumentTitleRef.current === null) {
      baseDocumentTitleRef.current = stripUnreadTabPrefix(document.title)
    }
    return () => {
      const base = baseDocumentTitleRef.current
      if (base) document.title = base
    }
  }, [])

  useEffect(() => {
    const base = baseDocumentTitleRef.current ?? stripUnreadTabPrefix(document.title)
    baseDocumentTitleRef.current = base
    if (!open) {
      document.title = base
      return
    }
    if (openForReading || unreadCount === 0) {
      document.title = base
    } else {
      const tabLabel = unreadCount > 99 ? '99+' : String(unreadCount)
      document.title = `(${tabLabel}) ${base}`
    }
  }, [open, openForReading, unreadCount])

  const syncMentionFromDraft = useCallback((value: string, cursor: number) => {
    const before = value.slice(0, cursor)
    const at = before.lastIndexOf('@')
    if (at < 0) {
      setMentionOpen(false)
      setMentionStart(null)
      setMentionFilter('')
      return
    }
    const beforeAtOk = at === 0 || /[\s\n]/.test(before[at - 1]!)
    if (!beforeAtOk) {
      setMentionOpen(false)
      setMentionStart(null)
      setMentionFilter('')
      return
    }
    const frag = before.slice(at + 1)
    if (frag.includes('\n')) {
      setMentionOpen(false)
      return
    }
    setMentionOpen(true)
    setMentionStart(at)
    setMentionFilter(frag)
  }, [])

  const handleInputCursor = useCallback(
    (el: HTMLInputElement) => {
      const v = el.value
      const c = el.selectionStart ?? v.length
      setDraft(v)
      syncMentionFromDraft(v, c)
    },
    [syncMentionFromDraft],
  )

  useEffect(() => {
    setMentionHighlight(0)
  }, [mentionFilter, mentionChoices.length])

  const insertMention = useCallback(
    (label: string) => {
      const el = inputRef.current
      const pos = el?.selectionStart ?? draft.length
      const start = mentionStart
      if (start === null) return
      const next = draft.slice(0, start) + `@${label} ` + draft.slice(pos)
      setDraft(next)
      setMentionOpen(false)
      setMentionStart(null)
      setMentionFilter('')
      const newPos = start + label.length + 2
      requestAnimationFrame(() => {
        if (!inputRef.current) return
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newPos, newPos)
        syncMentionFromDraft(next, newPos)
      })
    },
    [draft, mentionStart, syncMentionFromDraft],
  )

  const send = useCallback(() => {
    if (readOnly) return
    const t = draft.trim()
    if (!t) return
    socket.emit('chatMessage', { text: t })
    setDraft('')
    setMentionOpen(false)
    setMentionStart(null)
    setMentionFilter('')
  }, [draft, readOnly, socket])

  if (!open) return null

  const activity = [...(roomState.activityLog ?? [])].slice().reverse().slice(0, 40)

  const shellClass =
    layout === 'dock' && nestedInHud
      ? 'relative z-auto flex w-full flex-col'
      : layout === 'dock'
        ? 'relative z-auto flex w-full flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm'
        : 'fixed bottom-3 left-3 z-[85] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm'

  const showInnerHeader = !(layout === 'dock' && nestedInHud)
  const showMessages = nestedDock ? true : expanded

  return (
    <section className={shellClass} aria-label="Chat y actividad de la mesa">
      {showInnerHeader ? (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 border-b border-[var(--vtt-border-subtle)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)]"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-label={
            unreadCount > 0 && !expanded
              ? `Chat y actividad, ${unreadCount} mensajes no leídos`
              : 'Chat y actividad'
          }
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate">Chat y actividad</span>
            {!expanded && unreadCount > 0 ? (
              <span
                className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--vtt-gold)] px-1 font-vtt-display text-[0.65rem] font-bold tabular-nums leading-none text-[var(--vtt-bg)]"
                aria-hidden
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[var(--vtt-text-muted)]">{expanded ? '−' : '+'}</span>
        </button>
      ) : null}
      {showMessages ? (
        <>
          {activity.length > 0 ? (
            <div
              className="max-h-28 overflow-y-auto border-b border-[var(--vtt-border-subtle)] px-3 py-2 text-[0.7rem] leading-snug text-[var(--vtt-text-muted)]"
              role="log"
              aria-label="Registro de actividad"
            >
              {activity.map((a) => (
                <p key={a.id} className="mb-1 break-words">
                  <span className="font-mono text-[0.65rem] text-[var(--vtt-gold-dim)]">
                    [{a.kind}]
                  </span>{' '}
                  {a.text}
                </p>
              ))}
            </div>
          ) : null}
          <div
            className="flex flex-col-reverse max-h-40 overflow-y-auto px-3 py-2 text-sm"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {roomState.chatLog.length === 0 ? (
              <p className="text-xs text-[var(--vtt-text-muted)]">Sin mensajes aún.</p>
            ) : (
              [...roomState.chatLog].map((m) => (
                  <p key={m.id} className="mb-1.5 break-words leading-snug">
                    <span className="font-semibold text-[var(--vtt-gold-dim)]">{m.author}:</span>{' '}
                    <span className={`text-[var(--vtt-text)] ${m.whisper ? 'italic text-[var(--vtt-gold-dim)] opacity-90' : ''}`}>
                      {m.whisper ? <strong className="text-[var(--vtt-forest)] text-xs mr-1">[Susurro]</strong> : null}
                      {m.text}
                    </span>
                  </p>
                ))
            )}
          </div>
          {readOnly ? (
            <p className="border-t border-[var(--vtt-border-subtle)] px-3 py-2 text-xs text-[var(--vtt-text-muted)]">
              Modo espectador: solo lectura.
            </p>
          ) : (
            <div className="relative flex gap-2 border-t border-[var(--vtt-border-subtle)] p-2">
              <div className="relative min-w-0 flex-1">
                {mentionOpen && mentionChoices.length > 0 ? (
                  <ul
                    className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-36 overflow-y-auto rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-surface)] py-1 shadow-lg"
                    role="listbox"
                    aria-label="Jugadores en sala"
                  >
                    {mentionChoices.map((t, i) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === mentionHighlight}
                          className={`flex w-full px-2 py-1.5 text-left text-sm ${
                            i === mentionHighlight
                              ? 'bg-[var(--vtt-surface-warm)] text-[var(--vtt-text)]'
                              : 'text-[var(--vtt-text-muted)] hover:bg-[var(--vtt-surface-warm)]/80'
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setMentionHighlight(i)}
                          onClick={() => insertMention(t.label)}
                        >
                          @{t.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label htmlFor="vtt-chat-input" className="sr-only">
                  Mensaje (usa @ para mencionar)
                </label>
                <input
                  ref={inputRef}
                  id="vtt-chat-input"
                  className="vtt-input w-full min-w-0 text-sm"
                  value={draft}
                  onChange={(e) => handleInputCursor(e.currentTarget)}
                  onKeyUp={(e) => handleInputCursor(e.currentTarget)}
                  onClick={(e) => handleInputCursor(e.currentTarget)}
                  onKeyDown={(e) => {
                    if (mentionOpen && mentionChoices.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setMentionHighlight((h) => Math.min(mentionChoices.length - 1, h + 1))
                        return
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setMentionHighlight((h) => Math.max(0, h - 1))
                        return
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const pick = mentionChoices[mentionHighlight] ?? mentionChoices[0]
                        if (pick) insertMention(pick.label)
                        return
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        setMentionOpen(false)
                        return
                      }
                    }
                    if (e.key === 'Enter') send()
                  }}
                  maxLength={500}
                  placeholder="Escribe @ para mencionar…"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                className="vtt-btn-primary shrink-0 px-3 text-xs"
                onClick={send}
              >
                Enviar
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
