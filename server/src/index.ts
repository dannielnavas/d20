import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createCorsOrigin } from './cors-config.js'
import { applyJoinSession, parseJoinPayload } from './join-handlers.js'
import {
  checkSessionPassword,
  hasSessionPassword,
  publicRoomState,
} from './room-session-password.js'
import { clearTokenSocketsOnLeave } from './on-disconnect.js'
import { getOrCreateRoom } from './rooms.js'
import { registerClaimHandler } from './socket-claim.js'
import { registerDmHandlers } from './socket-dm.js'
import { registerTokenHandlers } from './socket-tokens.js'
import type { VttSocketData } from './socket-data.js'

const PORT = Number(process.env.PORT) || 3000
const corsOrigin = createCorsOrigin()

const app = express()
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())

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

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
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
})

httpServer.listen(PORT, () => {
  console.log(`VTT server http://localhost:${PORT}`)
})
