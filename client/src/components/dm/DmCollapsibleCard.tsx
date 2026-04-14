import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'

export type DmCollapsibleCardProps = {
  roomId: string
  /** Clave estable dentro de la sala (p. ej. `timer`, `dice`). */
  sectionId: string
  title: string
  /** Contador o etiqueta breve junto al título (p. ej. solicitudes pendientes). */
  badge?: ReactNode
  children: ReactNode
  className?: string
  /** Contenido solo visible cuando está expandido (por defecto todo `children`). */
  bodyClassName?: string
  defaultExpanded?: boolean
  /** Notifica cuando cambia el estado (p. ej. badge de no leídos en el chat). */
  onExpandedChange?: (expanded: boolean) => void
}

function storageKeyFor(roomId: string, sectionId: string) {
  return `d20-dm-section:${roomId}:${sectionId}`
}

export function DmCollapsibleCard({
  roomId,
  sectionId,
  title,
  badge,
  children,
  className = '',
  bodyClassName = '',
  defaultExpanded = true,
  onExpandedChange,
}: DmCollapsibleCardProps) {
  const labelId = useId()
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    const key = storageKeyFor(roomId, sectionId)
    try {
      const raw = localStorage.getItem(key)
      if (raw === '0') {
        setExpanded(false)
        onExpandedChange?.(false)
      } else if (raw === '1') {
        setExpanded(true)
        onExpandedChange?.(true)
      }
    } catch {
      /* noop */
    }
  }, [onExpandedChange, roomId, sectionId])

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKeyFor(roomId, sectionId), next ? '1' : '0')
      } catch {
        /* noop */
      }
      onExpandedChange?.(next)
      return next
    })
  }, [onExpandedChange, roomId, sectionId])

  return (
    <section
      className={`vtt-surface vtt-glow-border flex w-full flex-col overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 shadow-lg backdrop-blur-sm ${className}`}
      aria-label={title}
    >
      <button
        type="button"
        id={labelId}
        className="flex w-full items-center justify-between gap-2 border-b border-[var(--vtt-border-subtle)] px-3 py-2 text-left font-vtt-display text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] hover:bg-[var(--vtt-surface-warm)]/60"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={`${labelId}-panel`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{title}</span>
          {badge != null && badge !== false && badge !== '' ? (
            <span className="shrink-0 font-mono text-[0.65rem] font-normal normal-case tracking-normal text-[var(--vtt-text-muted)]">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-[var(--vtt-text-muted)]" aria-hidden>
          {expanded ? '−' : '+'}
        </span>
      </button>
      <div
        id={`${labelId}-panel`}
        className={bodyClassName || 'min-w-0'}
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  )
}
