/** Carga https://www.youtube.com/iframe_api una sola vez (para unMute/play tras gesto del usuario). */
export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = window as Window & {
    YT?: { Player: unknown }
    onYouTubeIframeAPIReady?: () => void
  }
  if (w.YT?.Player) return Promise.resolve()

  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      done()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }

    const poll = window.setInterval(() => {
      if (w.YT?.Player) {
        window.clearInterval(poll)
        done()
      }
    }, 32)
    window.setTimeout(() => window.clearInterval(poll), 20000)
  })
}

/**
 * Extrae el id de vídeo y opcionalmente el id de lista desde URLs de YouTube.
 * Soporta: watch?v=, youtu.be/, /embed/, /shorts/
 */
export function parseYoutubeUrl(raw: string): {
  videoId: string
  listId: string | null
} | null {
  const input = raw.trim()
  if (!input) return null

  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./, '')

    let videoId: string | null = null
    const listId: string | null = u.searchParams.get('list')

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      if (id) videoId = id
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        videoId = u.searchParams.get('v')
      } else {
        const embed = u.pathname.match(/^\/embed\/([^/?]+)/)
        if (embed?.[1]) videoId = embed[1]
        const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/)
        if (shorts?.[1]) videoId = shorts[1]
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{6,32}$/.test(videoId)) return null

    return { videoId, listId: listId && listId.length > 0 ? listId : null }
  } catch {
    return null
  }
}

/**
 * URL del reproductor incrustado (fondo: autoplay silenciado por políticas del navegador;
 * el audio se activa con la API tras un clic del usuario). `origin` recomendado con `enablejsapi`.
 * - Sin parámetro `list`: bucle del vídeo único (`loop` + `playlist` = mismo id).
 * - Con `list` (p. ej. desde un enlace watch con lista): reproduce en contexto de lista
 *   (sin forzar bucle, para no chocar con la API de incrustación de YouTube).
 */
export function youtubeEmbedSrc(
  parsed: {
    videoId: string
    listId: string | null
  },
  opts?: { origin?: string },
): string {
  const base = `https://www.youtube.com/embed/${encodeURIComponent(parsed.videoId)}`

  const api: Record<string, string> = {
    enablejsapi: '1',
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '0',
  }
  if (opts?.origin) api.origin = opts.origin

  if (parsed.listId) {
    const p = new URLSearchParams({ ...api, list: parsed.listId })
    return `${base}?${p.toString()}`
  }

  const p = new URLSearchParams({
    ...api,
    loop: '1',
    playlist: parsed.videoId,
  })
  return `${base}?${p.toString()}`
}
