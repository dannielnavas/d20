# Contexto del Proyecto: VTT (Virtual Tabletop) Minimalista en Tiempo Real

## Objetivo
Crear una aplicación web ligera y rápida para partidas de rol. La premisa principal es la **simplicidad extrema para el jugador**: la interfaz debe ser tan intuitiva que un grupo de **N jugadores** (cualquier tamaño de mesa razonable para el VTT) pueda usarla de inmediato sin tutoriales, cuentas ni menús complejos. El diseño no asume un número fijo de participantes: habrá tantos asientos de jugador como tokens `pc` defina el DM en la sala.

El Dungeon Master (DM) cargará un mapa (imagen o video mp4) y tokens. Los **N** jugadores entran mediante un enlace único, cada uno hace clic en un personaje disponible en el lobby y juega.

## Stack Tecnológico Requerido
* **Backend:** Node.js, Express, Socket.io (comunicación en tiempo real a 30-60fps).
* **Frontend:** React (Vite), Tailwind CSS. Para la manipulación del mapa y tokens se recomienda usar HTML5 Canvas (ej. Konva.js/react-konva) o librerías de DOM optimizadas (ej. `react-zoom-pan-pinch` combinado con `framer-motion` o `dnd-kit`).
* **Estado:** En memoria del servidor (Node.js).

## Requerimientos Técnicos Clave (Cruciales)
1. **Zoom y Paneo Infinito:** El mapa debe poder arrastrarse y tener zoom fluido (rueda del ratón o táctil).
2. **Sistema de Cuadrícula (Snap to Grid):** Opción (toggleable por el DM) para que al soltar un token, este se ajuste magnéticamente a una cuadrícula invisible, facilitando el conteo de casillas.
3. **Manejo de Capas (Z-Index):** - Capa 0: Fondo (Imagen/Video del mapa).
   - Capa 1: Cuadrícula (opcional).
   - Capa 2: Tokens (Al arrastrar un token, este debe pasar temporalmente al frente de los demás para evitar superposiciones incómodas).
4. **Resiliencia de Conexión:** Cualquier jugador entre los **N** conectados que recargue la página o se desconecte brevemente, al reconectar debe recibir al instante el estado actual del tablero y seguir vinculado a su personaje.

## Flujo de Usuario y Permisos
* **Vista Jugador (`/play/sala-123`):** Al entrar, ve un "Lobby" con **todos** los tokens tipo `pc` (Player Character) que el DM haya colocado y que sigan libres (no reclamados por otro socket). Con **N** jugadores en la mesa, hasta **N** tokens `pc` distintos pueden estar asignados a la vez; cada jugador elige uno libre y entra al mapa. **Regla de oro:** Solo puede mover SU token.
* **Vista DM (`/play/sala-123?role=dm&key=secret`):** Entra directo como administrador. Tiene un panel lateral donde puede:
  - Cambiar la URL/Archivo del mapa base.
  - Agregar nuevos tokens PNJ (monstruos/aliados) al tablero.
  - Mover **cualquier** token (sea jugador o PNJ).
  - Activar/Desactivar el Snap to Grid.

## Estructura de Datos Base (Mental Model para Node.js)
```json
{
  "roomId": "campana-123",
  "settings": {
    "backgroundUrl": "[https://url-del-mapa.mp4](https://url-del-mapa.mp4)",
    "backgroundType": "video",
    "gridSize": 50,
    "snapToGrid": true
  },
  "tokens": [
    { "id": "t1", "name": "Bárbaro", "img": "...", "x": 100, "y": 200, "size": 50, "type": "pc", "ownerSocket": "xyz_123" },
    { "id": "t2", "name": "Mago", "img": "...", "x": 150, "y": 200, "size": 50, "type": "pc", "ownerSocket": null },
    { "id": "t3", "name": "Goblin", "img": "...", "x": 300, "y": 300, "size": 50, "type": "npc", "ownerSocket": "dm" }
  ]
}

Fases de Implementación Exigidas

Actúa como un Desarrollador Full-Stack Senior y guía el desarrollo paso a paso. No asumas configuraciones, genera el código completo para cada fase.

Fase 1: Andamiaje y Conexión Base
Configura el servidor Express + Socket.io y el cliente Vite + React. Establece la lógica de conexión: cuando un cliente entra, se une a un room específico y el servidor le envía el objeto de estado actual de esa sala.

Fase 2: Motor de Renderizado (Mapa y Navegación)
Construye el componente principal del tablero. Debe soportar tanto imágenes fijas como videos en loop como fondo. Implementa la lógica matemática o usa la librería elegida para permitir un paneo suave y zoom sin que los elementos pierdan su posición relativa.

Fase 3: Entidades y Física (Tokens y Drag & Drop)
Crea el sistema de tokens. Implementa el Drag & Drop sincronizado mediante WebSockets. Aquí debes programar la lógica del snapToGrid (si está activo, redondear las coordenadas X, Y al múltiplo de gridSize más cercano al soltar el clic) y la emisión en tiempo real mientras se arrastra.

Fase 4: Sistema de Lobby y Permisos
Programa la pantalla de selección de personajes para **N** jugadores: lista dinámica de tokens `pc` disponibles vs. ya reclamados. Implementa la validación en el frontend y en el backend para garantizar que cada socket de jugador solo emita movimientos válidos para **el único** token `pc` que le corresponde (sin colisiones entre jugadores al elegir el mismo personaje).

Fase 5: Herramientas de Dungeon Master
Construye el Drawer/Panel lateral exclusivo del DM. Añade los formularios para actualizar el fondo del mapa en tiempo real y el botón para "spawnear" nuevos tokens NPC en el centro de la pantalla.

Comienza configurando la Fase 1. Indícame la estructura de carpetas sugerida y dame los comandos de terminal para inicializar el backend y el frontend.
