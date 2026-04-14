import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { signDmJwt } from './auth-dm.js'
import { registerAutomationApi } from './automation.js'
import { createCorsOrigin } from './cors-config.js'
import { applyJoinSession, parseJoinPayload } from './join-handlers.js'
import { DM_SECRET } from './dm-secret.js'
import { log } from './logger.js'
import { loadSnapshot, persistNow } from './persistence.js'
import {
  checkSessionPassword,
  hasSessionPassword,
  publicRoomState,
  type PublicRoomViewer,
} from './room-session-password.js'
import { clearTokenSocketsOnLeave } from './on-disconnect.js'
import { getOrCreateRoom } from './rooms.js'
import { clearSocketLimits } from './rate-limit.js'
import { clearMediaPeer, registerMediaHandlers } from './socket-media.js'
import { registerChatHandlers } from './socket-chat.js'
import { registerClaimHandler } from './socket-claim.js'
import { registerImageRevealHandlers } from './socket-image-reveal.js'
import { registerDiceHandlers } from './socket-dice.js'
import { registerDmHandlers } from './socket-dm.js'
import { registerMapPingHandlers } from './socket-map-ping.js'
import { registerScreenReactionHandlers } from './socket-screen-reaction.js'
import { registerTokenReactionHandlers } from './socket-token-reaction.js'
import { registerPollHandlers } from './socket-poll.js'
import { registerRaiseHandHandlers } from './socket-raise-hand.js'
import { registerRollRequestHandlers } from './socket-roll-request.js'
import { registerMapToolsHandlers } from './socket-map-tools.js'
import { emitTimerSyncToSocket } from './room-timer.js'
import { registerTimerHandlers } from './socket-timer.js'
import { emitPrivateNotesInitial, registerPrivateNotesHandlers } from './socket-private-notes.js'
import { registerTokenHandlers } from './socket-tokens.js'
import type { VttSocketData } from './socket-data.js'
import { maybeAttachRedisAdapter } from './redis-adapter.js'

const PORT = Number(process.env.PORT) || 3000
const corsOrigin = createCorsOrigin()

const app = express()
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())

app.get('/', (_req, res) => {
  const wantsJson = _req.headers.accept?.includes('application/json')
  if (wantsJson) {
    res.json({
      service: 'd20-vtt',
      hint: 'API Socket.io; el cliente web suele ir en otro puerto (p. ej. 5173).',
      endpoints: { health: '/health' },
    })
    return
  }
  res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>d20 — servidor de mesa</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #e8e4dc; background: #1a1814; }
    a { color: #c9a44c; }
    code { background: #2a2620; padding: 0.15em 0.4em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>d20 — servidor</h1>
  <p>Este puerto es el <strong>backend</strong> (Express + Socket.io). La interfaz del juego la sirve Vite en desarrollo:</p>
  <p><code>npm run dev --prefix client</code> → suele ser <a href="http://localhost:5173">http://localhost:5173</a></p>
  <p>O desde la raíz del repo: <code>npm run dev</code> (cliente + servidor).</p>
  <p>Estado: <a href="/health">/health</a></p>
</body>
</html>`)
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'd20-vtt' })
})

/** Intercambia la clave DM por un JWT de corta duración (preferible a enviar dmKey en cada join). */
app.post('/auth/dm', async (req, res) => {
  const body = req.body as { dmKey?: string }
  const key = typeof body?.dmKey === 'string' ? body.dmKey : ''
  if (key !== DM_SECRET) {
    res.status(401).json({ ok: false, error: 'Clave de DM incorrecta' })
    return
  }
  const { token, expiresInSec } = await signDmJwt()
  res.json({ ok: true, token, expiresIn: expiresInSec })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
registerAutomationApi(app, io)

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    clearMediaPeer(socket)
    clearTokenSocketsOnLeave(socket)
    clearSocketLimits(socket.id)
  })

  socket.on('joinRoom', async (payload: unknown) => {
    const parsed = parseJoinPayload(payload)
    if (!parsed) {
      socket.emit('roomError', {
        message: 'No encontramos la mesa en este enlace. Vuelve al inicio y abre la sala otra vez.',
      })
      return
    }

    const { roomId } = parsed

    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r)
    }

    await socket.join(roomId)
    const data = socket.data as VttSocketData
    data.roomId = roomId

    const state = getOrCreateRoom(roomId)

    if (hasSessionPassword(roomId)) {
      const pwd = parsed.sessionPassword ?? ''
      if (!checkSessionPassword(roomId, pwd)) {
        socket.emit('roomError', {
          message:
            pwd.length === 0
              ? 'Esta mesa tiene contraseña. Escríbela para entrar.'
              : 'Esa contraseña no coincide. Pide al director de juego la correcta.',
          code: pwd.length === 0 ? 'SESSION_PASSWORD_REQUIRED' : 'SESSION_PASSWORD_INVALID',
        })
        await socket.leave(roomId)
        delete data.roomId
        return
      }
    }

    if (!(await applyJoinSession(socket, state, parsed))) {
      await socket.leave(roomId)
      delete data.roomId
      return
    }

    const joinData = socket.data as VttSocketData
    let roomViewer: PublicRoomViewer
    if (joinData.isDm) roomViewer = { role: 'dm' }
    else if (joinData.isSpectator) roomViewer = { role: 'spectator' }
    else roomViewer = { role: 'player', playerSessionId: joinData.playerSessionId }

    socket.emit('roomState', publicRoomState(state, roomViewer))
    emitTimerSyncToSocket(socket, roomId)
    emitPrivateNotesInitial(socket, state)
  })

  registerTokenHandlers(io, socket)
  registerClaimHandler(io, socket)
  registerDmHandlers(io, socket)
  registerDiceHandlers(io, socket)
  registerImageRevealHandlers(io, socket)
  registerMediaHandlers(io, socket)
  registerChatHandlers(io, socket)
  registerPrivateNotesHandlers(io, socket)
  registerMapPingHandlers(io, socket)
  registerScreenReactionHandlers(io, socket)
  registerTokenReactionHandlers(io, socket)
  registerPollHandlers(io, socket)
  registerRollRequestHandlers(io, socket)
  registerRaiseHandHandlers(io, socket)
  registerMapToolsHandlers(io, socket)
  registerTimerHandlers(io, socket)
})

async function main() {
  await loadSnapshot()
  await maybeAttachRedisAdapter(io)

  httpServer.listen(PORT, () => {
    log.info('VTT server listening', { port: PORT })
  })

  const shutdown = async (signal: string) => {
    log.info('shutdown', { signal })
    try {
      await persistNow()
    } catch (e) {
      log.error('persist on shutdown failed', { err: String(e) })
    }
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

void main()
