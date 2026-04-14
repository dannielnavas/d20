# Eventos Socket.IO (referencia)

## Cliente → servidor

| Evento                                                                                      | Payload                                                                          | Notas                                                                                      |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `joinRoom`                                                                                  | `{ roomId, dmKey? \| dmToken?, playerSessionId?, sessionPassword?, spectator? }` | `spectator: true` = solo lectura (stream). Contraseña de sesión si la mesa está protegida. |
| `tokenMove` / `tokenMoveEnd`                                                                | `{ tokenId, x, y }`                                                              | Movimiento de ficha                                                                        |
| `claimPc`                                                                                   | `{ tokenId }`                                                                    | Jugador elige PC                                                                           |
| `diceRoll`                                                                                  | `{ dieType, mode }`                                                              | Tirada                                                                                     |
| `diceLogReset`                                                                              | —                                                                                | Solo DM                                                                                    |
| `chatMessage`                                                                               | `{ text }`                                                                       | Chat de mesa                                                                               |
| `mapPing`                                                                                   | `{ x, y }`                                                                       | Ping en coordenadas mundo; jugadores solo si `settings.playersCanPing`                     |
| `initiativeRollAll`                                                                         | —                                                                                | DM: orden por d20 (+ modificadores)                                                        |
| `initiativeSetModifier`                                                                     | `{ tokenId, modifier }`                                                          | DM: mod numérico por PJ                                                                    |
| `initiativeNext` / `initiativeMove` / `initiativeSetCurrent` / `initiativeToggleVisibility` | ver código                                                                       | DM                                                                                         |
| `tokenSetConditions`                                                                        | `{ tokenId, conditions: string[] }`                                              | DM o PJ propio token                                                                       |
| `updateRoomSettings`, `spawnPc`, `spawnNpc`, …                                              | ver `socket-dm.ts`                                                               | DM                                                                                         |

## Servidor → cliente

| Evento                                                | Contenido                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `roomState`                                           | `RoomState` público (`roomVersion`, tokens sin `ownerSocket`, etc.) |
| `sessionState`                                        | Rol: `dm` \| `player` \| `spectator` + `claimedTokenId`             |
| `roomError` / `tokenError` / `claimError` / `dmError` | Errores                                                             |
| `diceRolled`                                          | Entrada de log de tirada                                            |
| `tokenMove` / `tokenMoveEnd`                          | Posición optimista                                                  |
| `mapPing`                                             | `{ x, y, by, ts }` efímero                                          |

## HTTP

- `GET /health` — salud
- `POST /auth/dm` — body `{ dmKey }` → `{ token, expiresIn }`

## UI / accesibilidad (cliente)

- Fichas movibles: foco con Tab; **flechas** envían `tokenMove` y `tokenMoveEnd` discretos; **Mayús** aumenta el paso (según `gridSize` / ajuste a cuadrícula del mapa).
- El contenedor del mapa incluye texto oculto para lectores de pantalla (`aria-describedby`).
- Espectador: URL `?spectator=1` — ve mapa e iniciativa/chat en lectura; no mueve fichas ni escribe en chat.
- DM: vista Mesa con mapa, fichas y ping (sin herramientas de dibujo ni escenas guardadas).
