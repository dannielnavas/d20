import type { Server } from 'socket.io'
import { log } from './logger.js'

/**
 * Si `REDIS_URL` está definido, usa el adapter Redis para Socket.IO (varias instancias compartiendo salas).
 * Requiere dependencias: `redis` y `@socket.io/redis-adapter`.
 */
export async function maybeAttachRedisAdapter(io: Server): Promise<void> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return

  try {
    const { createClient } = await import('redis')
    const { createAdapter } = await import('@socket.io/redis-adapter')

    const pubClient = createClient({ url })
    const subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(createAdapter(pubClient, subClient))

    log.info('socket.io redis adapter activo', { url: url.replace(/:[^:@/]+@/, ':****@') })
  } catch (e) {
    log.warn('redis adapter no disponible; instancia única', {
      err: String(e),
    })
  }
}
