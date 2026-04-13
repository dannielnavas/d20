# Integracion Stream Deck

La API de automatizacion permite disparar acciones de DM desde Stream Deck usando HTTP.

## 1) Configuracion

En `server/.env`:

- `AUTOMATION_ENABLED=1`
- `AUTOMATION_TOKEN=tu_token_largo`
- `AUTOMATION_LOCAL_ONLY=1` (recomendado)

Header requerido en todas las peticiones:

- `x-automation-token: <AUTOMATION_TOKEN>`

Endpoint:

- `POST http://localhost:3000/automation/actions`

Body base:

```json
{
  "action": "initiative.next",
  "roomId": "demo",
  "payload": {}
}
```

## 2) Acciones soportadas

### initiative.next

```json
{ "action": "initiative.next", "roomId": "demo", "payload": {} }
```

### initiative.visibility

```json
{
  "action": "initiative.visibility",
  "roomId": "demo",
  "payload": { "visible": true }
}
```

### dice.roll

```json
{
  "action": "dice.roll",
  "roomId": "demo",
  "payload": { "dieType": "d20", "mode": "advantage", "roller": "Deck" }
}
```

### media.playPause

Activa/desactiva audio del mapa. Si no envias `enabled`, alterna estado.

```json
{
  "action": "media.playPause",
  "roomId": "demo",
  "payload": { "enabled": true }
}
```

### media.volume

```json
{
  "action": "media.volume",
  "roomId": "demo",
  "payload": { "volume": 55 }
}
```

### map.centerToken

```json
{
  "action": "map.centerToken",
  "roomId": "demo",
  "payload": { "tokenId": "pc-123", "x": 800, "y": 450 }
}
```

Si omites `x`/`y`, se usa centro por defecto (`800`,`450`).

## 3) Botones recomendados (MVP)

- Siguiente turno
- Mostrar iniciativa
- Ocultar iniciativa
- Tirar d20 normal
- Tirar d20 con ventaja
- Toggle audio del mapa

## 4) Ejemplo curl

```bash
curl -X POST "http://localhost:3000/automation/actions" \
  -H "content-type: application/json" \
  -H "x-automation-token: tu_token_largo" \
  -d '{"action":"initiative.next","roomId":"demo","payload":{}}'
```

La API devuelve `ok: true` cuando aplica la accion, o un error con codigo HTTP y mensaje.
