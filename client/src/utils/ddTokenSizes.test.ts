import { describe, expect, it } from 'vitest'
import { ddCategoryFromPixelSize, pixelSizeFromDdCategory } from './ddTokenSizes'

describe('ddTokenSizes', () => {
  it('calcula px a partir de grid y categoría (ej. grid 50)', () => {
    expect(pixelSizeFromDdCategory('medium', 50)).toBe(50)
    expect(pixelSizeFromDdCategory('large', 50)).toBe(100)
    expect(pixelSizeFromDdCategory('huge', 50)).toBe(150)
    expect(pixelSizeFromDdCategory('gargantuan', 50)).toBe(200)
  })

  it('infiere categoría desde tamaño actual', () => {
    expect(ddCategoryFromPixelSize(50, 50)).toBe('medium')
    expect(ddCategoryFromPixelSize(100, 50)).toBe('large')
    expect(ddCategoryFromPixelSize(150, 50)).toBe('huge')
    expect(ddCategoryFromPixelSize(200, 50)).toBe('gargantuan')
  })
})
