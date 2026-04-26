import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'

export type DmCollapsibleCardProps = {
  roomId: string
  /** Clave estable dentro de la sala (p. ej. `timer`, `dice`). */
  sectionId: string
  title: string
  /** Icono SVG o cualquier ReactNode que aparece a la izquierda del título. */
  icon?: ReactNode
  /** Color de acento del icono: 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' */
  iconAccent?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'muted'
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

const accentColors: Record<string, string> = {
  indigo:  'text-[#818cf8] bg-[#818cf8]/10 border-[#818cf8]/20',
  amber:   'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  emerald: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/20',
  rose:    'text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20',
  sky:     'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20',
  violet:  'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20',
  muted:   'text-[var(--vtt-text-muted)] bg-white/5 border-white/10',
}

function storageKeyFor(roomId: string, sectionId: string) {
  return `d20-dm-section:${roomId}:${sectionId}`
}

export function DmCollapsibleCard({
  roomId,
  sectionId,
  title,
  icon,
  iconAccent = 'indigo',
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

  const accentCls = accentColors[iconAccent] ?? accentColors.indigo

  return (
    <section
      className={`vtt-collapsible-shell flex w-full flex-col overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface)]/80 backdrop-blur-sm transition-all duration-200 ${expanded ? 'shadow-[0_4px_24px_-4px_rgba(99,102,241,0.12)]' : ''} ${className}`}
      aria-label={title}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <button
        type="button"
        id={labelId}
        className={`vtt-collapsible-trigger group flex min-h-[2.75rem] w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.03] ${expanded ? 'border-b border-[var(--vtt-border-subtle)]' : ''}`}
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={`${labelId}-panel`}
      >
        {icon ? (
          <span className={`vtt-collapsible-icon flex shrink-0 items-center justify-center rounded-md border p-1 text-[0.9rem] leading-none transition-all duration-200 ${accentCls} ${expanded ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`} aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`truncate font-vtt-display text-[0.7rem] font-semibold uppercase tracking-[0.09em] transition-colors duration-150 ${expanded ? 'text-[var(--vtt-text)]' : 'text-[var(--vtt-text-muted)] group-hover:text-[var(--vtt-text)]'}`}>
            {title}
          </span>
          {badge != null && badge !== false && badge !== '' ? (
            <span className="vtt-collapsible-badge inline-flex min-h-[1.1rem] min-w-[1.1rem] shrink-0 items-center justify-center rounded-full bg-[var(--vtt-ember)] px-1 font-mono text-[0.6rem] font-bold leading-none text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <svg
          className={`vtt-collapsible-chevron shrink-0 text-[var(--vtt-text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div
        id={`${labelId}-panel`}
        className={`vtt-collapsible-panel vtt-collapse ${expanded ? 'is-open' : ''}`}
        data-open={expanded ? 'true' : 'false'}
        aria-hidden={!expanded}
      >
        <div className={bodyClassName || 'min-w-0'}>{children}</div>
      </div>
    </section>
  )
}
