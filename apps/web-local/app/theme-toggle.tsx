'use client'

import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'foodxpres-local-theme'
type Theme = 'dark' | 'light'
const THEME_EVENT = 'foodxpres-local-theme-change'
const subscribe = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(THEME_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
const getTheme = (): Theme => {
  try { return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}
const getServerTheme = (): Theme => 'dark'

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* El tema sigue activo durante esta sesión. */ }
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  const label = theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'
  return (
    <button type="button" className="local-theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>
      )}
    </button>
  )
}
