import { useEffect, useRef, useState } from 'react'
import videoSrc from '../assets/Creación_de_Video_para_Pantalla_de_Carga.mp4'

type LoadingScreenProps = Readonly<{
  visible: boolean
}>

export function LoadingScreen({ visible }: LoadingScreenProps) {
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
      aria-label="Cargando la mesa…"
      className="fixed inset-0 z-[9999] overflow-hidden bg-black"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: prefersReducedMotion ? 'none' : 'opacity 700ms ease-out',
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Video a pantalla completa */}
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        muted
        playsInline
        loop
        tabIndex={-1}
      />
    </div>
  )
}
