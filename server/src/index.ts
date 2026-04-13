import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { registerAutomationApi } from './automation.js'
import { createCorsOrigin } from './cors-config.js'
import { applyJoinSession, parseJoinPayload } from './join-handlers.js'
import {
  checkSessionPassword,
  hasSessionPassword,
  publicRoomState,
} from './room-session-password.js'
import { clearTokenSocketsOnLeave } from './on-disconnect.js'
import { getOrCreateRoom } from './rooms.js'
import { clearMediaPeer, registerMediaHandlers } from './socket-media.js'
import { registerClaimHandler } from './socket-claim.js'
import { registerDiceHandlers } from './socket-dice.js'
import { registerDmHandlers } from './socket-dm.js'
import { registerTokenHandlers } from './socket-tokens.js'
import type { VttSocketData } from './socket-data.js'

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
  res.json({ ok: true })
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
  })

  socket.on('joinRoom', async (payload: unknown) => {
    const parsed = parseJoinPayload(payload)
    if (!parsed) {
      socket.emit('roomError', { message: 'roomId requerido' })
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
              ? 'Esta mesa está protegida: introduce la contraseña de sesión.'
              : 'Contraseña de sesión incorrecta.',
          code:
            pwd.length === 0
              ? 'SESSION_PASSWORD_REQUIRED'
              : 'SESSION_PASSWORD_INVALID',
        })
        await socket.leave(roomId)
        delete data.roomId
        return
      }
    }

    if (!applyJoinSession(socket, state, parsed)) {
      await socket.leave(roomId)
      delete data.roomId
      return
    }

    socket.emit('roomState', publicRoomState(state))
  })

  registerTokenHandlers(io, socket)
  registerClaimHandler(io, socket)
  registerDmHandlers(io, socket)
  registerDiceHandlers(io, socket)
  registerMediaHandlers(io, socket)
})

httpServer.listen(PORT, () => {
  console.log(`VTT server http://localhost:${PORT}`)
})
