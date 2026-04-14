# Backlog (fases sugeridas)

## Completado recientemente

- Modularización de `PlayRoom` (hooks en `client/src/hooks/playroom/`)
- JWT DM (`POST /auth/dm`, `dmToken` en `joinRoom`)
- CI GitHub Actions, tests Vitest (client + server)
- Persistencia JSON de salas + hashes de contraseña de sesión
- `roomVersion` en estado, rate limits en chat/ping/movimiento
- Logs JSON estructurados (`server/src/logger.ts`)
- Chat de mesa, ping en mapa (Shift+clic), tirada de orden de iniciativa (d20)

## P2 (madurez) — hecho

- Teclado en fichas movibles (Tab + flechas + Mayús), foco visible, texto para SR en el lienzo
- DX: Prettier, EditorConfig, Husky, lint-staged, commitlint (Conventional Commits)
- Adapter Redis opcional (`REDIS_URL` + [`redis-adapter.ts`](../server/src/redis-adapter.ts))
- [RUNBOOK](RUNBOOK.md) operativo

## Próximas mejoras técnicas

- Tests de integración Socket.IO (join + movimiento)
- Estado de sala compartido entre nodos (además del adapter Redis)
- Sanitizar más metadatos en `publicRoomState` si hace falta

## Features de producto (estrategia)

- Niebla de guerra / capas
- Plantillas de área y regla
- Escenas múltiples por campaña
- Modo espectador
- Permisos granulares por jugador
