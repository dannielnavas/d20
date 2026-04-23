import { useEffect, useRef, useState } from 'react'
import logoSrc from '../assets/ChatGPT Image 22 abr 2026, 19_11_27.png'
import videoSrc from '../assets/Creación_de_Video_para_Pantalla_de_Carga.mp4'

type LoadingScreenProps = Readonly<{
  visible: boolean
  leadText?: string
  loadingText?: string
}>

export function LoadingScreen({ visible, leadText, loadingText }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(visible)
  const [fadingOut, setFadingOut] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion =
    globalThis.window !== undefined &&
    globalThis.window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (visible) {
      setShouldRender(true)
      setFadingOut(false)
    } else if (prefersReducedMotion) {
      setShouldRender(false)
    } else {
      setFadingOut(true)
    }
  }, [visible, prefersReducedMotion])

  function handleTransitionEnd() {
    if (fadingOut) {
      setShouldRender(false)
      setFadingOut(false)
    }
  }

  if (!shouldRender) return null

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={loadingText ?? 'Cargando la mesa…'}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: prefersReducedMotion ? 'none' : 'opacity 700ms ease-out',
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Video de fondo */}
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        muted
        playsInline
        loop
        tabIndex={-1}
      />

      {/* Velo oscuro sobre el video para dar contraste al logo y texto */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"
        aria-hidden="true"
      />

      {/* Logo centrado */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <img
          src={logoSrc}
          alt="d20 — Tu mesa virtual"
          className="w-48 drop-shadow-[0_0_48px_rgba(201,164,58,0.6)] sm:w-64 md:w-72"
          draggable={false}
        />

        {/* Texto de estado en la parte inferior */}
        <div className="flex flex-col items-center gap-1 text-center">
          {leadText ? (
            <p
              className="font-vtt-display text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-[var(--vtt-gold-dim)]"
              aria-hidden="true"
            >
              {leadText}
            </p>
          ) : null}
          {loadingText ? (
            <p className="font-vtt-display text-sm font-semibold tracking-[0.15em] text-[var(--vtt-gold)]">
              {loadingText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
