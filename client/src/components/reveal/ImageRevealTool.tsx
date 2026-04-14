import { useCallback, useId, useState } from 'react'
import type { Socket } from 'socket.io-client'

type ImageRevealToolProps = {
  socket: Socket
  /** DM: columna del director; jugador: panel flotante compacto. */
  variant?: 'dm' | 'player'
  /** Dentro de `DmCollapsibleCard`: oculta el título duplicado. */
  embedded?: boolean
}

export function ImageRevealTool({ socket, variant = 'dm', embedded = false }: ImageRevealToolProps) {
  const id = useId()
  const inputId = `${id}-url`
  const [url, setUrl] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const send = useCallback(() => {
    setLocalErr(null)
    const t = url.trim()
    if (!t) {
      setLocalErr('Pega la URL de la imagen.')
      return
    }
    socket.emit('imageReveal', { url: t })
    setUrl('')
  }, [socket, url])

  const shell =
    variant === 'player'
      ? 'vtt-surface vtt-glow-border w-[min(18rem,calc(100vw-1.5rem))] rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 p-2 shadow-lg backdrop-blur-sm'
      : 'vtt-surface vtt-glow-border w-full space-y-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)]/90 p-3'

  return (
    <section className={shell} aria-label="Mostrar imagen a la mesa">
      {embedded ? null : (
        <p className="font-vtt-display text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[var(--vtt-gold)]">
          Revelar imagen (URL)
        </p>
      )}
      <p className="text-[0.65rem] leading-relaxed text-[var(--vtt-text-muted)]">
        Todos ven la imagen en un modal centrado unos 10 s. Solo enlaces http(s), sin subir archivos.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">
          URL de la imagen
        </label>
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="vtt-input text-xs"
        />
        {localErr ? (
          <p className="text-[0.65rem] text-[var(--vtt-danger-text)]" role="status">
            {localErr}
          </p>
        ) : null}
        <button type="button" className="vtt-btn-primary text-xs" onClick={send}>
          Mostrar a la mesa (10 s)
        </button>
      </div>
    </section>
  )
}
