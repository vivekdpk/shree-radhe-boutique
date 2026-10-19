import { useEffect, useRef, useState } from 'react'
import { api } from './api'

export const WEBSITE_LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'hindi', label: 'हिन्दी' },
] as const
export type WebsiteLanguage = typeof WEBSITE_LANGUAGES[number]['id']
const STORAGE_KEY = 'shree-radhe-boutique-language'
const isLanguage = (value: string | null): value is WebsiteLanguage => WEBSITE_LANGUAGES.some(item => item.id === value)
function initialLanguage(): WebsiteLanguage {
  try { const value = localStorage.getItem(STORAGE_KEY); return isLanguage(value) ? value : 'hinglish' } catch { return 'hinglish' }
}

export function useWebsiteLanguage(): [WebsiteLanguage, (language: WebsiteLanguage) => Promise<void>] {
  const [language, setLanguageState] = useState<WebsiteLanguage>(initialLanguage)
  const changedLocally = useRef(false)
  useEffect(() => {
    let active = true
    const sync = () => { api.siteLanguage().then(result => { if (!active || changedLocally.current) return; setLanguageState(result.language); try { localStorage.setItem(STORAGE_KEY, result.language) } catch {} }).catch(() => {}) }
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY && isLanguage(event.newValue)) { changedLocally.current = false; setLanguageState(event.newValue) } }
    sync(); const timer = window.setInterval(sync, 60_000); window.addEventListener('storage', onStorage)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('storage', onStorage) }
  }, [])
  async function setLanguage(next: WebsiteLanguage) {
    const previous = language; changedLocally.current = true; setLanguageState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    try { await api.updateSiteLanguage(next); changedLocally.current = false }
    catch (error) { changedLocally.current = false; setLanguageState(previous); try { localStorage.setItem(STORAGE_KEY, previous) } catch {}; throw error }
  }
  return [language, setLanguage]
}
