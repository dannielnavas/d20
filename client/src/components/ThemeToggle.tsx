import { useTheme } from '../hooks/useTheme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      className={`dm-theme-toggle group inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--vtt-text)] transition hover:border-[var(--vtt-border)] ${className}`}
      aria-pressed={isDark}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      <span
        className="relative flex h-5 w-9 shrink-0 items-center rounded-full bg-[var(--vtt-surface-warm)] p-0.5 ring-1 ring-[var(--vtt-border-subtle)] transition group-hover:ring-[var(--vtt-border)]"
        aria-hidden
      >
        <span
          className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--vtt-gold)] shadow-sm transition-transform duration-200 ease-out ${
            isDark ? 'translate-x-[1.125rem]' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="font-vtt-display tracking-[0.12em] text-[var(--vtt-text-muted)]">
        {isDark ? 'Oscuro' : 'Claro'}
      </span>
    </button>
  )
}
