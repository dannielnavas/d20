/** Tamaños tácticos D&D 5e como múltiplos del lado de casilla (`gridSize` en px). */

export const DD_TOKEN_SIZE_MULTIPLIERS = {
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
} as const

export type DdTokenSizeCategory = keyof typeof DD_TOKEN_SIZE_MULTIPLIERS

const ORDER: DdTokenSizeCategory[] = ['small', 'medium', 'large', 'huge', 'gargantuan']

export const DD_TOKEN_SIZE_LABELS: Record<DdTokenSizeCategory, string> = {
  small: 'Pequeño (S)',
  medium: 'Mediano (M)',
  large: 'Grande (L)',
  huge: 'Enorme (H)',
  gargantuan: 'Gargantúa (G)',
}

/** Mismo criterio que el servidor para `spawn*`: 24–200 px. */
export function pixelSizeFromDdCategory(category: DdTokenSizeCategory, gridSize: number): number {
  const g = Math.max(8, Math.min(200, Math.round(gridSize)))
  const raw = DD_TOKEN_SIZE_MULTIPLIERS[category] * g
  return Math.min(200, Math.max(24, Math.round(raw)))
}

/** Infiere la categoría a partir del tamaño actual y la cuadrícula (p. ej. tras cargar sala). */
export function ddCategoryFromPixelSize(size: number, gridSize: number): DdTokenSizeCategory {
  const g = Math.max(8, Math.min(200, Math.round(gridSize)))
  const ratio = size / g
  if (ratio < 1.5) {
    return ratio < 1 ? 'small' : 'medium'
  }
  if (ratio < 2.5) return 'large'
  if (ratio < 3.5) return 'huge'
  return 'gargantuan'
}

export function ddSizeCategoriesOrdered(): DdTokenSizeCategory[] {
  return [...ORDER]
}
