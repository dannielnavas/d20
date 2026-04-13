import type { CorsOptions } from 'cors'

const VERCEL_HOST = /\.vercel\.app$/i

/**
 * Orígenes permitidos: lista en CLIENT_ORIGIN (coma) y, opcionalmente, previews en *.vercel.app.
 */
export function createCorsOrigin(): CorsOptions['origin'] {
  const raw = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
  const explicit = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const allowVercel =
    process.env.CORS_ALLOW_VERCEL === '1' || process.env.CORS_ALLOW_VERCEL === 'true'

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true)
      return
    }
    if (explicit.includes(origin)) {
      callback(null, true)
      return
    }
    if (allowVercel) {
      try {
        const host = new URL(origin).hostname
        if (VERCEL_HOST.test(host)) {
          callback(null, true)
          return
        }
      } catch {
        callback(null, false)
        return
      }
    }
    callback(null, false)
  }
}
