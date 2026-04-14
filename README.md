# d20 — VTT en tiempo real

Monorepo: **client** (Vite + React) y **server** (Express + Socket.IO).

## Requisitos

- Node.js 20+

## Desarrollo

```bash
npm install
npm install --prefix client
npm install --prefix server
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

Variables: copia `server/.env.example` a `server/.env` y ajusta `DM_SECRET`, `CLIENT_ORIGIN`, etc.

## Scripts (raíz)

| Comando                | Descripción                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Cliente + servidor en paralelo |
| `npm run build`        | Build cliente y servidor       |
| `npm run test`         | Tests Vitest (client + server) |
| `npm run lint`         | ESLint en el cliente           |
| `npm run typecheck`    | `tsc` en client y server       |
| `npm run format`       | Prettier en el repo            |
| `npm run format:check` | Comprueba formato Prettier     |

Tras `npm install` en la raíz, Husky instala hooks (`prepare`): **pre-commit** ejecuta `lint-staged` (Prettier en Markdown/JSON/YAML, etc.); **commit-msg** valida [Conventional Commits](https://www.conventionalcommits.org/) con commitlint.

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — visión general
- [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md) — eventos Socket.IO
- [docs/BACKLOG.md](docs/BACKLOG.md) — ideas y fases
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — operación, Redis, incidentes

## DM en producción

1. Define `DM_SECRET` (y opcionalmente `JWT_SECRET`) en el servidor.
2. El cliente puede obtener un JWT con `POST /auth/dm` y unirse con `dmToken` en `joinRoom` (evita repetir la clave en cada reconexión).

## Persistencia

El servidor guarda un snapshot JSON (`server/data/vtt-snapshot.json` por defecto) con salas y hashes de contraseña de sesión. Configurable con `PERSISTENCE_PATH`.

## Redis (opcional, varias réplicas)

Si defines `REDIS_URL`, el servidor intenta cargar el [adapter Redis](https://socket.io/docs/v4/redis-adapter/) de Socket.IO para broadcast entre instancias. Si falla, sigue en modo un solo proceso. Ver [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Accesibilidad (tablero)

Las fichas que puedes mover son **botones enfocables** (Tab). Con foco, **flechas** desplazan la ficha; **Mayús** aumenta el paso. El lienzo del mapa incluye instrucciones para lectores de pantalla (`aria-describedby`).
