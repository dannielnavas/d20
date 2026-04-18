let audioCtx: AudioContext | null = null

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export function playChatSound() {
  const ctx = getContext()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, t)
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.05)
  
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.12, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}

export function playWhisperSound() {
  const ctx = getContext()
  if (!ctx) return
  const t = ctx.currentTime
  
  // A double ping for whispers/notes
  for (let i = 0; i < 2; i++) {
    const timeOffset = t + i * 0.15
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800 + i * 200, timeOffset)
    
    gain.gain.setValueAtTime(0, timeOffset)
    gain.gain.linearRampToValueAtTime(0.15, timeOffset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, timeOffset + 0.2)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(timeOffset)
    osc.stop(timeOffset + 0.2)
  }
}

export function playHandRaisedSound() {
  const ctx = getContext()
  if (!ctx) return
  const t = ctx.currentTime
  
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, t)
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1)
  
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.2, t + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.3)
}
