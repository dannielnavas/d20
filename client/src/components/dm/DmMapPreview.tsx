import { useMemo } from 'react'
import type { RoomState } from '../../types/room'
import { parseYoutubeUrl, youtubeEmbedSrc } from '../../utils/youtube'

type DmMapPreviewProps = {
  settings: RoomState['settings']
  className?: string
}

export function DmMapPreview({ settings, className = '' }: DmMapPreviewProps) {
  const { backgroundUrl, backgroundType } = settings
  const url = backgroundUrl.trim()
  const hasMedia = Boolean(url)

  const youtubeParsed =
    hasMedia && backgroundType === 'video' ? parseYoutubeUrl(url) : null

  const ytEmbedSrc = useMemo(() => {
    if (!youtubeParsed) return ''
    return youtubeEmbedSrc(youtubeParsed, {
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    })
  }, [youtubeParsed])

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}
      aria-label="Vista previa del mapa configurado"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--vtt-gold-dim)]">
            Previsualización
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--vtt-text)]">Así verán el fondo</p>
        </div>
        <span className="rounded-full border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] px-2.5 py-1 font-mono text-[0.65rem] text-[var(--vtt-text-muted)]">
          {hasMedia ? (backgroundType === 'video' ? 'Vídeo' : 'Imagen') : 'Vacío'}
        </span>
      </div>

      <div
        className="relative aspect-video w-full max-h-[min(52svh,480px)] overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[#040302] shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: 'var(--dm-map-chrome, #040302)' }}
      >
        {hasMedia && backgroundType === 'video' && youtubeParsed && ytEmbedSrc ? (
          <iframe
            key={url}
            title="Vista previa de mapa (YouTube)"
            className="pointer-events-none absolute inset-0 h-full w-full border-0 object-contain"
            src={ytEmbedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : null}
        {hasMedia && backgroundType === 'video' && !youtubeParsed ? (
          <video
            key={url}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            src={url}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
          />
        ) : null}
        {hasMedia && backgroundType === 'image' ? (
          <img
            key={url}
            alt=""
            role="presentation"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            src={url}
          />
        ) : null}
        {!hasMedia ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-vtt-display text-sm font-semibold text-[var(--vtt-gold)]">
              Sin mapa todavía
            </p>
            <p className="max-w-xs text-xs text-[var(--vtt-text-muted)]">
              Añade una URL en el panel izquierdo y pulsa «Aplicar fondo».
            </p>
            <div
              className="absolute inset-0 opacity-[0.12]"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(to right, var(--vtt-gold) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--vtt-gold) 1px, transparent 1px)
                `,
                backgroundSize: '48px 48px',
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
