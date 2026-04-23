# Design Guidelines (Web App)

Esta guia resume reglas practicas para mantener una UI consistente en la aplicacion.

## Layout

- Usar `vtt-page-shell` para contenedores principales de pagina.
- Evitar paneles flotantes duplicados en la misma region visual.
- En mapa, preferir un solo dock inferior para herramientas persistentes.
- Todo panel flotante debe tener `max-height` y scroll interno.

## Componentes base

- Superficies: `vtt-panel` para contenedores y `vtt-panel-header` para cabeceras.
- Botones:
  - Accion principal: `vtt-btn-primary`.
  - Accion secundaria: `vtt-btn-secondary`.
  - Accion neutral/tooling: `vtt-btn-ghost`.
- Campos: `vtt-input` para inputs, selects y textareas.
- Estados compactos: `vtt-pill`, `vtt-status-dot`.
- Notificaciones: `vtt-toast`.

## Accesibilidad

- Mantener foco visible en todos los elementos interactivos.
- Objetivos tactiles minimos de 44x44 px para controles clave.
- Controles icon-only deben tener `aria-label`.
- Colapsables con `aria-expanded` y `aria-controls`.
- Mensajes de error con `role="alert"` cuando aplique.

## Responsive

- Mobile first: verificar 360 px, 390 px, 768 px y 1280 px.
- Evitar desbordes horizontales.
- Paneles de chat/dados/call deben poder colapsar y no tapar acciones criticas.
- Respetar safe areas con `vtt-safe-bottom` en docks inferiores.

## Motion y rendimiento

- Preferir transiciones cortas (`--vtt-motion-fast` o `--vtt-motion-base`).
- Evitar animaciones decorativas largas en componentes de alta frecuencia.
- Respetar `prefers-reduced-motion`.
- Evitar reflow abrupto al mostrar/ocultar docks y overlays.

## Checklist rapido antes de merge

- [ ] Sin solapamientos criticos en Home, PlayRoom y mapa.
- [ ] Navegacion por teclado funcional en chat, dados y llamada.
- [ ] Contraste legible en dark y light.
- [ ] Sin barras vacias no intencionales ni contenido oculto.
- [ ] Typecheck del cliente en verde.
