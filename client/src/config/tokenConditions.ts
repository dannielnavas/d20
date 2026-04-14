/**
 * Apariencia de estados de ficha (envenenado, paralizado…): icono, color y animación CSS.
 * El texto en mesa puede ser libre; se hace match por normalización (minúsculas, sin acentos).
 */

export type ConditionAnimationId = 'pulse' | 'shake' | 'glow' | 'float' | 'blink' | 'orbit'

export type ConditionVisualDef = {
  /** Etiquetas que activan esta apariencia (minúsculas, sin acentos). */
  labels: string[]
  /** Carácter o emoji mostrado en el badge. */
  icon: string
  /** Color principal (borde / resplandor). */
  accent: string
  /** Fondo del badge. */
  background: string
  animation: ConditionAnimationId
}

/** Orden: las primeras coincidencias ganan. */
export const TOKEN_CONDITION_VISUALS: readonly ConditionVisualDef[] = [
  {
    labels: ['envenenado', 'veneno', 'poisoned', 'poison'],
    icon: '☠',
    accent: '#5cb85c',
    background: 'rgba(20, 48, 28, 0.92)',
    animation: 'pulse',
  },
  {
    labels: ['paralizado', 'paralyzed', 'paralysis'],
    icon: '❄',
    accent: '#7ec8e3',
    background: 'rgba(18, 42, 58, 0.92)',
    animation: 'float',
  },
  {
    labels: ['derribado', 'prone', 'tirado'],
    icon: '↓',
    accent: '#a67c52',
    background: 'rgba(48, 36, 24, 0.92)',
    animation: 'shake',
  },
  {
    labels: ['cegado', 'blinded', 'blind'],
    icon: '◎',
    accent: '#6b6b6b',
    background: 'rgba(24, 24, 24, 0.92)',
    animation: 'blink',
  },
  {
    labels: ['ensordecido', 'deafened', 'deaf'],
    icon: '◈',
    accent: '#8b7aa8',
    background: 'rgba(32, 26, 44, 0.92)',
    animation: 'pulse',
  },
  {
    labels: ['asustado', 'frightened', 'miedo', 'fear'],
    icon: '⚠',
    accent: '#c75c40',
    background: 'rgba(52, 22, 18, 0.92)',
    animation: 'shake',
  },
  {
    labels: ['encantado', 'charmed', 'charm'],
    icon: '♥',
    accent: '#d4729c',
    background: 'rgba(48, 22, 36, 0.92)',
    animation: 'glow',
  },
  {
    labels: ['agarrado', 'grappled', 'agarre'],
    icon: '◎',
    accent: '#c9a43a',
    background: 'rgba(40, 32, 18, 0.92)',
    animation: 'orbit',
  },
  {
    labels: ['aturdido', 'stunned', 'stun'],
    icon: '★',
    accent: '#e8d44a',
    background: 'rgba(48, 44, 14, 0.92)',
    animation: 'pulse',
  },
  {
    labels: ['invisible', 'invisibilidad'],
    icon: '◌',
    accent: '#c0c8d8',
    background: 'rgba(28, 32, 40, 0.75)',
    animation: 'blink',
  },
  {
    labels: ['petrificado', 'petrified', 'stone'],
    icon: '▣',
    accent: '#8a8a8a',
    background: 'rgba(36, 36, 38, 0.92)',
    animation: 'shake',
  },
  {
    labels: ['quemando', 'burning', 'fuego', 'burn'],
    icon: '🔥',
    accent: '#e85d2c',
    background: 'rgba(48, 18, 8, 0.88)',
    animation: 'glow',
  },
  {
    labels: ['congelado', 'frozen', 'cold'],
    icon: '🧊',
    accent: '#6ab0ff',
    background: 'rgba(16, 36, 56, 0.92)',
    animation: 'float',
  },
  {
    labels: ['inconsciente', 'unconscious'],
    icon: '💤',
    accent: '#7a6a9c',
    background: 'rgba(28, 22, 40, 0.92)',
    animation: 'pulse',
  },
  {
    labels: ['exhausto', 'exhaustion', 'cansancio'],
    icon: '⋯',
    accent: '#8a8070',
    background: 'rgba(36, 32, 28, 0.92)',
    animation: 'float',
  },
] as const

const DEFAULT_VISUAL: Omit<ConditionVisualDef, 'labels'> = {
  icon: '✦',
  accent: 'var(--vtt-gold)',
  background: 'rgba(24, 20, 16, 0.92)',
  animation: 'pulse',
}

function normalizeLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function resolveConditionVisual(raw: string): ConditionVisualDef {
  const n = normalizeLabel(raw)
  if (!n) {
    return { labels: [], ...DEFAULT_VISUAL }
  }
  for (const def of TOKEN_CONDITION_VISUALS) {
    if (def.labels.some((l) => l === n)) {
      return { ...def, labels: [...def.labels] }
    }
  }
  const short = [...n].slice(0, 2).join('') || '·'
  return {
    labels: [n],
    icon: short,
    accent: DEFAULT_VISUAL.accent,
    background: DEFAULT_VISUAL.background,
    animation: DEFAULT_VISUAL.animation,
  }
}

/** Clase CSS en `index.css` asociada a la animación. */
export function conditionAnimationClass(id: ConditionAnimationId): string {
  const map: Record<ConditionAnimationId, string> = {
    pulse: 'vtt-cond-anim-pulse',
    shake: 'vtt-cond-anim-shake',
    glow: 'vtt-cond-anim-glow',
    float: 'vtt-cond-anim-float',
    blink: 'vtt-cond-anim-blink',
    orbit: 'vtt-cond-anim-orbit',
  }
  return map[id]
}
