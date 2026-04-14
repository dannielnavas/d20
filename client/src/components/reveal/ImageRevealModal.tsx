import { useEffect, useId, useState } from 'react'
import type { ImageRevealPayload } from '../../types/image-reveal'

type ImageRevealModalProps = {
  reveal: ImageRevealPayload | null
  onDismiss: () => void
}

export function ImageRevealModal({ reveal, onDismiss }: ImageRevealModalProps) {
  const titleId = useId()
  const [imgErr, setImgErr] = useState(false)

  useEffect(() => {
    setImgErr(false)
  }, [reveal?.url])

  useEffect(() => {
    if (!reveal) return
    const t = window.setTimeout(onDismiss, reveal.durationMs)
    return () => window.clearTimeout(t)
  }, [reveal, onDismiss])

  useEffect(() => {
    if (!reveal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reveal, onDismiss])

  if (!reveal) return null

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div className="relative flex max-h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--vtt-border-subtle)] px-3 py-2">
          <p id={titleId} className="font-vtt-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vtt-gold)]">
            Revelación
          </p>
          <button
            type="button"
            className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-2 py-1 text-xs text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-text)]"
            onClick={onDismiss}
          >
            Cerrar
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/40 p-2">
          {imgErr ? (
            <p className="max-w-md px-4 text-center text-sm text-[var(--vtt-text-muted)]">
              El navegador no pudo cargar la imagen (CORS, enlace caducado o formato no soportado). Prueba
              otra URL o súbela a un host que permita enlazar imágenes.
            </p>
          ) : (
            <img
              src={reveal.url}
              alt="Imagen mostrada por el director o un jugador"
              className="max-h-[min(80vh,820px)] max-w-full object-contain"
              loading="eager"
              decoding="async"
              onError={() => setImgErr(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
