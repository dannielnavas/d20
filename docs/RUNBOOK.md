# Runbook operativo (d20 VTT)

## Arranque y parada

- **Desarrollo**: `npm run dev` (raíz) levanta API en `PORT` (3000) y Vite en 5173.
- **Producción (API)**: `npm run build --prefix server && npm run start --prefix server`.
- **Apagado**: el proceso guarda snapshot en `PERSISTENCE_PATH` al recibir `SIGINT` / `SIGTERM`.

## Variables críticas

| Variable           | Uso                                                                          |
| ------------------ | ---------------------------------------------------------------------------- |
| `DM_SECRET`        | Clave DM y firma JWT (si no hay `JWT_SECRET`).                               |
| `JWT_SECRET`       | Firma opcional distinta para JWT de DM.                                      |
| `CLIENT_ORIGIN`    | CORS del front (lista separada por comas).                                   |
| `PERSISTENCE_PATH` | Ruta del JSON de salas (default `server/data/vtt-snapshot.json`).            |
| `REDIS_URL`        | Si está definida, se activa el adapter Redis de Socket.IO (varias réplicas). |

## Redis (multi-instancia)

1. Redis accesible (p. ej. `redis://localhost:6379` o URL gestionada).
2. Misma `REDIS_URL` en todas las instancias del servidor Socket.IO.
3. El estado de sala sigue en memoria de cada proceso; el adapter solo **replica eventos** entre nodos. Para estado compartido real hace falta diseño adicional (no incluido aquí).

Si `REDIS_URL` es inválida o faltan dependencias, el servidor arranca en modo **una sola instancia** y deja un aviso en logs.

## Salud

- `GET /health` → `{ ok: true, service: 'd20-vtt' }`.

## Logs

Los mensajes del servidor son JSON en una línea (`ts`, `level`, `msg`, campos extra). Redirige stdout a tu agregador (Datadog, CloudWatch, etc.).

## Incidentes habituales

| Síntoma                                            | Comprobación                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| CORS bloqueado                                     | `CLIENT_ORIGIN` incluye el origen exacto del front (incl. `https`).         |
| Salas vacías tras reinicio                         | Revisa permisos de escritura en `PERSISTENCE_PATH` y logs de `persistence`. |
| Jugadores en “salas distintas” con varias réplicas | Confirma `REDIS_URL` y que todas las instancias la usan.                    |

## Seguridad

- Usa HTTPS delante del Node en producción.
- No expongas `AUTOMATION_*` a internet sin token fuerte y, si aplica, `AUTOMATION_LOCAL_ONLY=1`.
