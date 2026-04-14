# Arquitectura

```mermaid
flowchart LR
  subgraph client [Cliente Vite React]
    PlayRoom[PlayRoom]
    MapBoard[MapBoard]
    SocketIO[socket.io-client]
  end
  subgraph server [Servidor Node]
    Express[Express]
    IO[Socket.IO]
    Rooms[Estado en memoria Map roomId]
    Persist[Persistencia JSON]
    RedisOpt[Redis adapter opcional]
  end
  PlayRoom --> SocketIO
  SocketIO <-->|WebSocket| IO
  IO --> Rooms
  Rooms --> Persist
  RedisOpt -.->|si REDIS_URL| IO
  Express -->|CORS /health /auth/dm| client
```

- **Estado de juego**: un `RoomState` por sala en el proceso del servidor; se serializa a disco de forma debounced tras mutaciones relevantes.
- **DM**: autenticación por `dmKey` (desarrollo) o `dmToken` JWT (`POST /auth/dm`).
- **Jugadores**: `playerSessionId` persistente en `localStorage` para reclamar el mismo PC al reconectar.

## Carpetas clave

| Ruta                            | Rol                                      |
| ------------------------------- | ---------------------------------------- |
| `client/src/pages/PlayRoom.tsx` | Orquestación de la sala                  |
| `client/src/hooks/playroom/`    | Socket, FX de dados, intercambio JWT DM  |
| `server/src/index.ts`           | HTTP + Socket.IO + carga de snapshot     |
| `server/src/room-broadcast.ts`  | Emisión de `roomState` con `roomVersion` |
| `server/src/persistence.ts`     | Guardado/carga JSON                      |
| `server/src/redis-adapter.ts`   | Adapter Redis para Socket.IO (opcional)  |
