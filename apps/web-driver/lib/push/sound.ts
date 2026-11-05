let notificationAudio: HTMLAudioElement | null = null
let enabled = false

export function enablePushSound(): boolean {
  if (typeof window === 'undefined' || !('Audio' in window)) return false
  notificationAudio ??= new Audio('/audio/notification.mp3')
  notificationAudio.preload = 'auto'
  enabled = true
  void notificationAudio.play().then(() => {
    notificationAudio?.pause()
    if (notificationAudio) notificationAudio.currentTime = 0
  }).catch(() => undefined)
  return true
}

export function playPushSound() {
  if (!enabled || !notificationAudio) return
  notificationAudio.pause()
  notificationAudio.currentTime = 0
  void notificationAudio.play().catch(() => undefined)
}
