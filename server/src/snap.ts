export function snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
  const g = Math.max(1, gridSize)
  return {
    x: Math.round(x / g) * g,
    y: Math.round(y / g) * g,
  }
}
