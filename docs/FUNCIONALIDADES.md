# d20 — Funcionalidades (frontend y backend)

Inventario del monorepo **d20** (VTT ligero en tiempo real: React + Vite en `client/`, Express + Socket.io en `server/`).

---

## Backend (`server/`)

### HTTP (Express)

| Ruta | Función |
|------|---------|
| `GET /` | Página HTML informativa o JSON (`Accept: application/json`) con metadatos del servicio. |
| `GET /health` | Comprobación de vida: `{ ok: true, service: 'd20-vtt' }`. |
| `POST /auth/dm` | Intercambia `dmKey` por un **JWT de DM** de corta duración (evita reenviar la clave en cada `joinRoom`). |
| `POST /automation/actions` | API opcional de **automatización** (Stream Deck, scripts locales): requiere `AUTOMATION_ENABLED=1`, `AUTOMATION_TOKEN` y header `x-automation-token`. Detalle en `server/STREAM_DECK.md`. |

**CORS**: configurable (`server/src/cors-config.ts`); credenciales habilitadas para alinear con el cliente.

### API de automatización (cuando está habilitada)

Acciones soportadas (muchas exigen **DM conectado** en la sala):

- `initiative.next` — avanza turno de iniciativa.
- `initiative.visibility` — muestra/oculta iniciativa (`payload.visible`).
- `dice.roll` — tira dados (tipos d4–d100; ventaja/desventaja solo en d20).
- `media.playPause` — audio del mapa on/off o toggle.
- `media.volume` — volumen 0–100.
- `map.centerToken` — mueve un token a coordenadas (con snap si aplica).

Restricciones típicas: `AUTOMATION_LOCAL_ONLY` (solo loopback por defecto), validación de token.

### Socket.io — unión a sala

- **`joinRoom`**: valida `roomId`; limpia salas previas del socket; asigna `roomId` en `socket.data`.
- **Contraseña de sesión** (mesa): si la sala tiene hash configurado, exige `sessionPassword` correcto o emite `roomError` con códigos `SESSION_PASSWORD_REQUIRED` / `SESSION_PASSWORD_INVALID`.
- **`applyJoinSession`** (`server/src/join-handlers.ts`):
  - **DM** vía `dmToken` (JWT) o `dmKey` (se compara con `DM_SECRET`).
  - **Espectador** (`spectator: true`): solo lectura.
  - **Jugador**: exige `playerSessionId` válido; si ya había reclamado un PC (`claimedBy`), **re-enlaza** el socket al mismo personaje.
- Tras unirse con éxito: emite **`roomState`** (estado público de la sala).

### Socket.io — eventos de dominio

| Evento (cliente → servidor) | Rol / notas |
|-----------------------------|-------------|
| `tokenMove` / `tokenMoveEnd` | Mover fichas; validación de permisos (DM, o jugador solo su PC reclamado); **snap al soltar** si `snapToGrid`; rate limit. |
| `claimPc` | Jugador reclama un token `pc` libre. |
| `updateRoomSettings` | DM: fondo, tipo imagen/video, cuadrícula, snap, audio/volumen del mapa, si los jugadores pueden hacer ping. |
| `setSessionPassword` | DM: fija o borra contraseña de mesa (hash en servidor). |
| `spawnNpc` / `spawnPc` | DM: crea PNJ o uno o varios PCs (hasta 12 con nombres numerados). |
| `initiativeSetModifier`, `initiativeToggleVisibility`, `initiativeMove`, `initiativeRollAll`, `initiativeNext`, `initiativeSetCurrent` | DM: iniciativa completa. |
| `diceRoll` | DM o jugador con personaje; ventaja/desventaja en d20. |
| `diceLogReset` | Solo DM: vacía el log de dados. |
| `chatMessage` | Chat con límite de texto y rate limit. |
| `mapPing` | Ping en mapa (DM siempre; jugadores si `playersCanPing`). |
| `tokenSetConditions` | DM en cualquier token; jugador en **su** PC: hasta 6 condiciones. |
| `privateNoteSet` / `privateNoteDelete` | Notas privadas por jugador/DM sobre tokens; no se publican al resto. |
| `pollStart` / `pollVote` / `pollClose` | Encuestas grupales de la mesa (creación DM y votación en vivo). |
| `raiseHandSet` | Estado de “mano levantada” para turnos de palabra y atención del DM. |
| `rollRequestCreate` / `rollRequestResolve` | Solicitudes de tirada desde DM y resolución por jugador. |
| `timerStart` / `timerPause` / `timerResume` / `timerStop` | Temporizador de turno o escena sincronizado para toda la sala. |
| `screenReactionSend` / `tokenReactionSet` | Reacciones visuales globales y reacciones ligadas a tokens. |
| `imageRevealStart` / `imageRevealUpdate` / `imageRevealFinish` | Revelado progresivo de imagen para escenas/pistas. |
| `mediaJoin`, `mediaLeave`, `webrtcSignal` | Señalización WebRTC entre pares en la misma sala (`server/src/media-room.ts`). |

**Emisiones servidor → cliente** (entre otras): `roomState`, `roomError`, `sessionState`, `tokenError`, `claimError`, `dmError`, `tokenMove`, `tokenMoveEnd`, `diceRolled`, `mapPing`, eventos de media (`mediaPeersSnapshot`, `mediaPeerJoined`, `mediaPeerLeft`, `webrtcSignal`, `mediaError`) y actualizaciones de encuestas, notas privadas, mano levantada, temporizador, solicitudes de tirada, reveal de imagen y reacciones de pantalla/token.

### Lógica transversal (servidor)

- **Salas en memoria** (`server/src/rooms.ts`): `getOrCreateRoom`, migración suave de campos legacy, forma de `RoomState` (tokens, chat, dados, iniciativa, actividad, ajustes).
- **`broadcastRoomState`** (`server/src/room-broadcast.ts`): incrementa `roomVersion`, emite estado y programa persistencia.
- **`publicRoomState`** (`server/src/room-session-password.ts`): no expone `ownerSocket` a los clientes; indica `sessionPasswordConfigured`.
- **Persistencia** (`server/src/persistence.ts`): carga/guarda snapshot JSON (salas + hashes de contraseña de sesión); guardado diferido y al apagado (`SIGINT`/`SIGTERM`).
- **Redis adapter** (`server/src/redis-adapter.ts`): opcional con `REDIS_URL` para varias instancias Socket.io.
- **Rate limiting** por socket y evento (`server/src/rate-limit.ts`): `tokenMove`, `tokenMoveEnd`, `chatMessage`, `mapPing`.
- **Desconexión** (`server/src/on-disconnect.ts`): limpia `ownerSocket` de tokens al salir un jugador (no DM).
- **Actividad unificada** (`server/src/activity-log.ts`): entradas para chat, dados, reclamar PJ, iniciativa, etc. (hasta 120 entradas).
- **Sincronización de iniciativa** (`server/src/initiative-sync.ts`): orden y modificadores coherentes con los PCs existentes.
- **Módulos socket por dominio** (`server/src/socket-*.ts`): separación por contexto (chat, mapa, herramientas, timer, encuestas, reacciones, notas privadas, reveal, etc.) para escalar mantenimiento.

---

## Frontend (`client/`)

### Rutas y páginas

- **`/` (Home)**: landing con enlaces a sala demo (jugador / DM), `ThemeToggle`, texto sobre `DM_SECRET` y contraseña de sesión opcional.
- **`/play/:roomId` (`PlayRoom`)**: núcleo de la mesa.
- **Fallback**: cualquier otra ruta redirige a `/`.

### Entrada a la sala y sesiones

- **Query params**:
  - Jugador: `playerSessionId` persistente (`usePlayerSessionId`).
  - DM: `?role=dm&key=...`; el cliente intenta **POST `/auth/dm`** y guarda JWT en `sessionStorage` (`useDmTokenExchange`).
  - **Espectador**: `?spectator=1` o `true` — mapa y logs en solo lectura.
- **Contraseña de mesa**: si el servidor la exige, modal “Contraseña de la mesa” con opción de recordar en `sessionStorage`.
- **Estado de conexión** y mensajes de error con cierre manual.

### Lobby y permisos en UI

- **`CharacterLobby`**: lista de PCs; muestra ocupados/disponibles; `claimPc` al elegir.
- En mapa: **`canDragToken`** — DM mueve todo; jugador solo su PC; espectador no arrastra; el jugador no mueve NPCs.

### Tablero (`MapBoard` + capas)

- **Navegación DM**: pestañas **Mesa / Mapa / Elenco** (`DmScreenNav`).
- **Vista “Mapa” (solo DM)**: `DmMapSetupForm` + `DmMapPreview` (URL de fondo, tipo imagen/video, tamaño de cuadrícula, snap, ping de jugadores, contraseña de sesión).
- **Vista “Elenco” (solo DM)**: `DmCastForm` (spawn PNJ/PC) + `DmTokenRoster` (condiciones por token vía `tokenSetConditions`).
- **Vista Mesa**:
  - Zoom y paneo (`react-zoom-pan-pinch`).
  - Fondo: **imagen**, **vídeo** (URL directa en loop) o **YouTube** (embed + API).
  - DM: controles de **audio/volumen** del vídeo de mapa (`updateRoomSettings`).
  - **Cuadrícula** visual alineada con `gridSize`.
  - **Tokens** (`TokensLayer`): arrastre + **teclado** (flechas; Shift para paso mayor); emite `tokenMove` / `tokenMoveEnd`.
  - **Ping**: Shift+clic (`mapPing`) respetando `playersCanPing` y no en modo espectador (`MapPingLayer` / bridge).
  - Textos de ayuda y **accesibilidad** (skip link, `aria-*`, instrucciones en pantalla).

### Comunicación en tiempo real (`usePlayRoomSocket`)

- Conexión Socket.io (`websocket` + `polling`).
- Escucha: `roomState`, `roomError`, `tokenError`, `claimError`, `dmError`, `sessionState`, `diceRolled`, `tokenMove`, `tokenMoveEnd`.
- Actualización optimista de posición de tokens durante `tokenMove`.

### Dados, chat e iniciativa

- **`DicePanel`**: selección de dado (d4–d100), modo normal/ventaja/desventaja en d20, historial reciente desde `roomState.diceLog`.
- **Overlay de tirada** (`useRollFx`): animación y mensajes para crítico 20 / fallo 1 en d20.
- **`ChatPanel`**: registro de **actividad** (`activityLog`) + **chat**; espectador en solo lectura.
- **Menciones en chat** (`useChatMentionNotify` + utilidades): detección de menciones y notificación contextual.
- **`PrivateNotesPanel`**: notas privadas por token/objetivo, visibles solo para su autor (DM o jugador).
- **`InitiativePanel`**: visibilidad para jugadores solo si el DM la activa; DM puede reordenar, siguiente turno, tirar orden (d20+mods), modificadores por PJ.
- **Notificación de turno** (`useInitiativeTurnNotify`): avisos cuando cambia el turno activo.

### Herramientas de dirección (DM HUD)

- **Estructura DM modular** (`DmHudColumn`, `DmCollapsibleCard`, `DmSceneBar`): paneles plegables para agrupar controles.
- **`RollRequestInbox`**: bandeja para crear/seguir solicitudes de tirada a jugadores.
- **`DmTurnTimerBar` / `TurnTimerHud`**: control y visualización de temporizador de escena/turno.
- **`GroupPollPanel` + `PollStartModal`**: lanzamiento y seguimiento de encuestas durante la sesión.
- **`ImageRevealTool` + `ImageRevealModal`**: herramienta de revelado progresivo de imágenes en mesa.
- **`MapDmVideoAudioCard`**: control rápido de media del mapa integrado en HUD.

### Presencia, reacciones e interacción social

- **`PresenceStrip`**: banda de presencia en sala para ver participantes activos.
- **`ScreenReactionPalette` + `ScreenReactionOverlay`**: reacciones visuales efímeras para toda la mesa.
- **Reacciones de token** (`tokenReactions`): estados expresivos sobre fichas en mapa.
- **“Levantar la mano”** (`raiseHand`): señal no verbal para pedir turno de voz/acción.

### Audio/vídeo entre jugadores (`MediaDock`)

- Unión a “llamada” ligera vía `mediaJoin` / `mediaLeave`.
- **WebRTC** (oferta/respuesta/ICE) relayed por servidor entre sockets de la misma sala.
- STUN configurable (`VITE_STUN_URLS`) o STUN público por defecto.
- UI de micrófono/cámara/colgar; layout distinto en lobby vs mapa.

### Tema y utilidades

- **`ThemeProvider` / `ThemeToggle` / `useTheme`**: tema claro/oscuro.
- **Solo desarrollo**: bloque colapsable con JSON del estado de la sala en `PlayRoom`.

---

## Modelo de datos en sala (`RoomState`)

Incluye: `roomId`, `roomVersion`, `sessionPasswordConfigured`, `settings` (fondo, tipo, audio mapa, volumen, `gridSize`, `snapToGrid`, `playersCanPing`), `tokens` (PC/NPC, posición, tamaño, `claimedBy`, hasta 6 `conditions`), `chatLog`, `activityLog`, `diceLog`, `initiative` (orden, índice actual, visibilidad, modificadores), además de estados de presencia/reacciones, encuestas, notas privadas, temporizador, solicitudes de tirada y reveal de imagen.

Definición de tipos: `server/src/types.ts` y espejo en cliente (`client/src/types/room.ts`).

---

## Documentación relacionada

- Arranque y operación: `docs/RUNBOOK.md`
- Automatización / Stream Deck: `server/STREAM_DECK.md`
- Visión de producto y fases: `plan.md`
