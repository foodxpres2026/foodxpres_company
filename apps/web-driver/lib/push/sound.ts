let context: AudioContext | null = null
let enabled = false

export function enablePushSound(): boolean {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return false
  context ??= new AudioContext()
  enabled = true
  void context.resume().then(playPushSound).catch(() => undefined)
  return true
}

export function playPushSound() {
  if (!enabled || !context) return
  void context.resume().then(() => {
    if (!context) return
    const start = context.currentTime
    for (const [offset, frequency] of [[0, 880], [0.16, 1175]] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.24)
    }
  }).catch(() => undefined)
}
