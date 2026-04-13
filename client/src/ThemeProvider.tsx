import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'
import {
  applyTheme,
  type ThemeMode,
  getStoredTheme,
  resolveInitialTheme,
  setStoredTheme,
} from './theme'

function initialMode(): ThemeMode {
  const stored = getStoredTheme()
  if (stored) return stored
  return resolveInitialTheme()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => initialMode())

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      setStoredTheme(next)
      return next
    })
  }, [])

  const setLight = useCallback(() => {
    setStoredTheme('light')
    setMode('light')
  }, [])

  const setDark = useCallback(() => {
    setStoredTheme('dark')
    setMode('dark')
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggle, setLight, setDark }),
    [mode, toggle, setLight, setDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
