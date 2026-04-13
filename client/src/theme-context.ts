import { createContext } from 'react'
import type { ThemeMode } from './theme'

export type ThemeContextValue = {
  mode: ThemeMode
  toggle: () => void
  setLight: () => void
  setDark: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
