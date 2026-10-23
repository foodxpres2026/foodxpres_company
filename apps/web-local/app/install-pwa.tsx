'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPwa() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [help, setHelp] = useState('')

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setInstalled(isInstalled)
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' }).catch((error) => console.error('No se pudo registrar el service worker de Local:', error))
    }
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => { setInstalled(true); setInstallPrompt(null); setHelp('') }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function install() {
    if (!installPrompt) {
      setHelp(/iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 'En Safari: Compartir → Añadir a pantalla de inicio.'
        : 'Abre el menú del navegador y elige “Instalar FOODXPRES Local” o “Añadir a pantalla de inicio”.')
      return
    }
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      if (choice.outcome === 'accepted') setInstalled(true)
      else setHelp('Puedes instalarla después desde el menú del navegador.')
    } catch {
      setInstallPrompt(null)
      setHelp('Abre el menú del navegador y elige “Instalar FOODXPRES Local”.')
    }
  }

  if (installed) return null
  return <div className="pwa-install-control">
    <button type="button" onClick={() => void install()}>＋ Instalar app Local</button>
    {help && <p role="status">{help}</p>}
  </div>
}
