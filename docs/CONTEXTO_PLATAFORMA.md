# d20 — Contexto general de la plataforma

Este documento resume qué es la plataforma, cómo se usa y qué puede hacer cada rol dentro de la mesa. Está pensado como guía de contexto rápido para entender el producto completo sin tener que leer primero toda la documentación técnica.

## Qué es d20

d20 es una plataforma VTT ligera y en tiempo real para dirigir partidas de rol con tablero compartido, fichas, chat, dados, audio/vídeo y herramientas de conducción de mesa.

La plataforma está dividida en dos aplicaciones:

- `client/`: interfaz web construida con React + Vite.
- `server/`: servidor Express + Socket.IO que coordina estado, permisos, persistencia y comunicación en tiempo real.

Su objetivo principal es permitir que una mesa de juego funcione de forma ágil, con poca fricción, y con una separación clara entre lo que controla el Narrador y lo que puede hacer cada jugador.

## Roles dentro de la plataforma

La plataforma tiene tres roles operativos:

### Narrador

Es quien crea, controla y administra la mesa. Tiene acceso completo a la configuración, al elenco, al mapa y a las herramientas de coordinación.

### Jugador

Se une a una sala, elige un personaje y controla únicamente su ficha. Puede interactuar con la mesa, participar en chat, lanzar dados, usar reacciones y personalizar elementos de su personaje.

### Espectador

Puede observar la mesa en modo solo lectura. No mueve fichas, no reclama personajes y no altera el estado del juego.

## Qué ofrece la plataforma en conjunto

A nivel global, d20 incluye estas capacidades:

- Salas en tiempo real sincronizadas por Socket.IO.
- Mapa compartido con imagen, vídeo o YouTube como fondo.
- Cuadrícula configurable con snap opcional.
- Fichas de personajes jugadores y PNJ.
- Reclamo de personaje por sesión de jugador.
- Chat de mesa con actividad y menciones.
- Tiradas de dados y registro de resultados.
- Iniciativa sincronizada.
- Notas privadas entre jugador y Narrador.
- Encuestas grupales.
- Temporizador compartido.
- Reacciones de pantalla y reacciones sobre fichas.
- Sistema de mano levantada.
- Revelado progresivo de imágenes.
- Audio y vídeo entre participantes mediante WebRTC.
- Persistencia de salas y configuración.
- Protección opcional de mesa por contraseña.

## Flujo general de uso

La experiencia normal de una partida sigue esta lógica:

1. El Narrador entra a una sala con permisos elevados.
2. Configura mapa, escena, cuadrícula, elenco y herramientas de mesa.
3. Los jugadores entran a la misma sala.
4. Cada jugador elige un personaje disponible desde el lobby.
5. Una vez dentro, cada participante interactúa en tiempo real sobre el mismo estado compartido.
6. El Narrador coordina turnos, escenas, información y ritmo de la partida.

## Funcionalidades del Narrador

El Narrador tiene control administrativo, visual y narrativo sobre la mesa.

### Acceso y control de sala

- Entrar como Narrador mediante clave segura o token autenticado.
- Configurar contraseña de acceso para la mesa.
- Administrar reconexiones y estado persistido.
- Operar con control total sobre el estado de la sala.

### Gestión del mapa y la escena

- Cargar fondo de mapa por URL de imagen.
- Cargar fondo por vídeo directo.
- Usar mapas de YouTube como fondo.
- Configurar tamaño de cuadrícula.
- Activar o desactivar snap a cuadrícula.
- Permitir o bloquear pings de jugadores.
- Controlar audio y volumen del mapa cuando el fondo es vídeo.
- Cambiar escena activa.
- Previsualizar mapa y configuración antes de jugar.

### Gestión del elenco

- Crear personajes jugadores.
- Crear PNJ.
- Generar varios personajes de una vez.
- Definir nombre, imagen y tamaño de ficha.
- Mantener PNJ fuera del mapa hasta activarlos.
- Liberar el reclamo de una ficha si un jugador necesita recuperarla.
- Editar fichas existentes desde el panel del elenco.

### Control de fichas

- Mover cualquier ficha del tablero.
- Cambiar posición con snap al soltar.
- Editar imagen de personaje o PNJ.
- Editar color de marco de ficha y de cámara.
- Editar puntos de golpe actuales, máximos y temporales.
- Cambiar nombre de ficha.
- Gestionar condiciones o estados visibles sobre fichas.
- Ver manos levantadas vinculadas a personajes.

### Conducción de mesa

- Administrar iniciativa completa.
- Mostrar u ocultar iniciativa al grupo.
- Avanzar el turno actual.
- Reordenar combatientes.
- Definir modificadores.
- Lanzar iniciativa masiva.
- Usar temporizador para turnos o escenas.
- Crear encuestas grupales.
- Resolver solicitudes de tirada enviadas por jugadores.

### Comunicación y supervisión

- Ver actividad general de la mesa.
- Participar en chat.
- Recibir menciones directas como `@Narrador`.
- Mantener notas privadas con cada jugador.
- Ver resultados ocultos cuando una tirada es secreta.
- Supervisar presencia de participantes.
- Ver y gestionar la comunicación de audio/vídeo.

### Herramientas narrativas

- Lanzar reacciones de pantalla para toda la mesa.
- Mostrar imágenes progresivamente con el sistema de reveal.
- Centralizar la experiencia visual de la partida.
- Actuar como árbitro y coordinador del flujo de juego.

### Cámara del Narrador

- Tiene un tratamiento visual diferenciado respecto a los jugadores.
- Su cámara usa un marco especial para destacarlo como rol principal de conducción.
- Se prioriza visualmente en la disposición de vídeo dentro de la mesa.

## Funcionalidades de los jugadores

El jugador interactúa sobre su personaje y sobre las herramientas permitidas por la mesa.

### Entrada y sesión

- Entrar a una sala con `playerSessionId` persistente.
- Reconectar y recuperar su personaje reclamado.
- Acceder mediante contraseña de mesa si está protegida.
- Elegir un personaje libre desde el lobby.

### Personalización del personaje

- Cambiar la imagen de su personaje desde el lobby.
- Cambiar la imagen de su personaje durante la partida.
- Elegir un color de marco desde una paleta predefinida.
- Ver el color aplicado en ficha y cámara.
- Editar sus puntos de golpe actuales.
- Editar sus puntos de golpe máximos.
- Editar sus puntos de golpe temporales.
- Mantener esa personalización ligada a su ficha.

### Control en el tablero

- Mover únicamente su propio personaje reclamado.
- Usar teclado o arrastre para reposicionar la ficha.
- Hacer ping en el mapa si la mesa lo permite.
- Ver nombre, estados y barra de vida de las fichas.
- Ver visualmente sus HP con barra y valores.

### Chat y comunicación

- Escribir en el chat de mesa.
- Recibir y usar menciones.
- Mencionar al Narrador con `@Narrador`.
- Mantener notas privadas con el Narrador.
- Ver actividad relevante del grupo.

### Dados e interacción de reglas

- Lanzar dados permitidos.
- Usar ventaja y desventaja en d20.
- Hacer tiradas ocultas cuando el flujo de partida lo requiera.
- Enviar solicitudes de tirada al Narrador.
- Recibir aprobación o rechazo de esas solicitudes.
- Ver sus resultados y efectos visuales asociados a tiradas relevantes.

### Participación social en mesa

- Levantar la mano para pedir turno o atención.
- Responder encuestas grupales.
- Enviar reacciones de pantalla.
- Usar reacciones sobre ficha cuando corresponda.
- Participar en la llamada de audio y vídeo.

### Cámara del jugador

- Puede entrar o salir de la llamada.
- Puede activar o apagar micrófono.
- Puede activar o apagar cámara.
- Su cámara usa un marco visual estilo medieval.
- El color del marco depende de la selección del jugador.
- El retrato del personaje puede servir como identidad visual cuando aplique.

## Qué ve el espectador

El espectador está pensado para seguimiento pasivo.

- Ve la mesa en modo lectura.
- Puede observar mapa, fichas, actividad y ritmo de la partida.
- No mueve fichas.
- No reclama personajes.
- No altera configuración de sala.

## Estado compartido de la mesa

La plataforma sincroniza un `RoomState` que representa el estado común de la sesión. Ese estado incluye, entre otros elementos:

- Identidad de la sala.
- Ajustes del mapa.
- Escenas activas.
- Fichas en mesa.
- Reclamos de personajes.
- Chat y actividad.
- Dados.
- Iniciativa.
- Encuestas.
- Temporizador.
- Notas privadas.
- Reacciones.
- Estados de mano levantada.
- Datos necesarios para presencia y experiencia de sesión.

## Diferencia entre contexto técnico y contexto funcional

Para entender la plataforma conviene separar dos capas:

### Capa funcional

Es lo que viven Narrador y jugadores: mapa, fichas, dados, chat, iniciativa, cámaras, notas, reacciones, HP y ritmo de la partida.

### Capa técnica

Es cómo el sistema sostiene esa experiencia:

- Express para endpoints de soporte.
- Socket.IO para estado en tiempo real.
- WebRTC para audio y vídeo.
- Persistencia en snapshot JSON.
- Adaptador Redis opcional para escalar eventos.
- Validación de permisos por rol y por ficha.

## Permisos clave del sistema

La plataforma funciona con una política clara de permisos:

- El Narrador puede editar cualquier ficha.
- El jugador solo puede editar la ficha que controla.
- El jugador no controla PNJ.
- El espectador no modifica estado.
- Algunas funciones dependen de configuración de mesa, como el ping o ciertas interacciones públicas.

## Identidad visual actual de la plataforma

En la experiencia actual del producto hay varios rasgos importantes:

- El rol visible principal ya no se presenta como “DM”, sino como “Narrador”.
- Las cámaras tienen una estética más temática, con marcos decorativos.
- La cámara del Narrador se diferencia de la del resto.
- Los jugadores pueden personalizar su presencia visual con retrato y color.
- Los puntos de golpe forman parte visible de la experiencia del tablero.

## Casos de uso típicos

### Caso 1: preparación de sesión

El Narrador entra primero, configura el mapa, crea héroes y PNJ, ajusta cuadrícula y deja lista la escena.

### Caso 2: ingreso de jugadores

Cada jugador entra, elige su personaje, ajusta retrato, color y HP, y queda enlazado a su ficha.

### Caso 3: juego en vivo

Todos ven el mismo mapa. El Narrador mueve PNJ y controla ritmo; los jugadores mueven su personaje, usan chat, dados, notas, reacciones y cámaras.

### Caso 4: combate o escena estructurada

El Narrador activa iniciativa, usa temporizador, recibe solicitudes de tirada, lanza reacciones o revela imágenes, y mantiene control narrativo de la situación.

## Documentos recomendados para profundizar

Si después de este archivo se necesita más detalle, la referencia más útil es:

- `README.md`: arranque del proyecto y scripts.
- `docs/ARCHITECTURE.md`: visión de arquitectura.
- `docs/FUNCIONALIDADES.md`: inventario técnico detallado.
- `docs/SOCKET_EVENTS.md`: mapa de eventos en tiempo real.
- `docs/RUNBOOK.md`: operación y mantenimiento.

## Resumen ejecutivo

d20 es una plataforma de mesa virtual centrada en partidas en tiempo real. El Narrador dispone de control total sobre mapa, escena, fichas, ritmo y herramientas de conducción. Los jugadores controlan su personaje, su presencia visual, su barra de vida, su cámara y su interacción con la mesa. Todo está organizado alrededor de una sala compartida, sincronizada y persistente.
