/** Convierte coordenadas de pantalla a espacio mundo del tablero (origen 0,0 del contenido transformado). */
export function clientToWorld(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  positionX: number,
  positionY: number,
  scale: number,
): { x: number; y: number } {
  const s = scale || 1
  return {
    x: (clientX - viewportRect.left - positionX) / s,
    y: (clientY - viewportRect.top - positionY) / s,
  }
}
