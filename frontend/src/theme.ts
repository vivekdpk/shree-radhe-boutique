import { useEffect, useRef, useState } from 'react'
import { api } from './api'

export const BOUTIQUE_THEMES = [
  { id: 'forest', label: 'Forest green & cream' },
  { id: 'rose', label: 'Rose & ivory' },
  { id: 'plum', label: 'Plum & champagne' },
  { id: 'terracotta', label: 'Terracotta & sand' },
  { id: 'indigo', label: 'Indigo & ivory' },
  { id: 'black-blush', label: 'Black & blush' },
] as const

export type BoutiqueTheme = typeof BOUTIQUE_THEMES[number]['id']
const STORAGE_KEY = 'shree-radhe-boutique-theme'

function isTheme(value: string | null): value is BoutiqueTheme {
  return BOUTIQUE_THEMES.some(theme => theme.id === value)
}

function getInitialTheme(): BoutiqueTheme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'forest'
  } catch { return 'forest' }
}

export function useBoutiqueTheme(): [BoutiqueTheme, (theme: BoutiqueTheme) => Promise<void>] {
  const [theme, setThemeState] = useState<BoutiqueTheme>(getInitialTheme)
  const changedLocally = useRef(false)

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key === STORAGE_KEY && isTheme(event.newValue)) {
        changedLocally.current = false
        setThemeState(event.newValue)
      }
      if (event.key === STORAGE_KEY && event.newValue === null) {
        changedLocally.current = false
        setThemeState('forest')
      }
    }
    let active = true
    const syncFromServer = () => {
      api.siteTheme().then(result => {
        if (!active || changedLocally.current) return
        setThemeState(result.theme)
        try { window.localStorage.setItem(STORAGE_KEY, result.theme) } catch { /* Theme remains active for this page view. */ }
      }).catch(() => {})
    }
    syncFromServer()
    const refreshTimer = window.setInterval(syncFromServer, 60_000)
    window.addEventListener('storage', syncTheme)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('storage', syncTheme)
    }
  }, [])

  async function setTheme(nextTheme: BoutiqueTheme) {
    const previousTheme = theme
    changedLocally.current = true
    setThemeState(nextTheme)
    try { window.localStorage.setItem(STORAGE_KEY, nextTheme) } catch { /* The selected theme still applies for this page view. */ }
    try {
      await api.updateSiteTheme(nextTheme)
      changedLocally.current = false
    } catch (error) {
      changedLocally.current = false
      setThemeState(previousTheme)
      try { window.localStorage.setItem(STORAGE_KEY, previousTheme) } catch { /* The previous theme remains active for this page view. */ }
      throw error
    }
  }

  return [theme, setTheme]
}
