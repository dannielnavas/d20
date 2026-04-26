import { useCallback, useId, useState, useEffect } from 'react'
import type { Socket } from 'socket.io-client'

const TIMEOUT_PRESETS: { label: string; sec: number }[] = [
  { label: 'Sin límite', sec: 0 },
  { label: '30 s', sec: 30 },
  { label: '1 min', sec: 60 },
  { label: '2 min', sec: 120 },
  { label: '5 min', sec: 300 },
  { label: '10 min', sec: 600 },
]

export type PollStartModalProps = {
  open: boolean
  onClose: () => void
  socket: Socket
}

export function PollStartModal({ open, onClose, socket }: PollStartModalProps) {
  const modalTitleId = useId()
  const [question, setQuestion] = useState('')
  const [opt, setOpt] = useState(['', '']) // Progressive disclosure: Start with 2
  const [timeoutSec, setTimeoutSec] = useState(0)
  
  // Handle escape key to close
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const submitNew = useCallback(() => {
    const options = opt.map((s) => s.trim()).filter(Boolean)
    if (options.length < 2 || !question.trim()) return
    socket.emit('pollStart', {
      question: question.trim(),
      options,
      timeoutSeconds: timeoutSec,
    })
    onClose()
    setQuestion('')
    setOpt(['', ''])
    setTimeoutSec(0)
  }, [opt, onClose, question, socket, timeoutSec])

  const handleAddOption = useCallback(() => {
    if (opt.length < 4) {
      setOpt((prev) => [...prev, ''])
    }
  }, [opt.length])

  const handleRemoveOption = useCallback((index: number) => {
    if (opt.length > 2) {
      setOpt((prev) => prev.filter((_, i) => i !== index))
    }
  }, [opt.length])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-black/55 p-4 sm:items-center transition-opacity"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="vtt-surface vtt-glow-border max-h-[min(90svh,36rem)] w-full max-w-md overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] p-4 shadow-xl transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id={modalTitleId}
            className="font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)]"
          >
            Nueva votación
          </h2>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--vtt-text-muted)] transition-colors hover:bg-[var(--vtt-surface-warm)] hover:text-[var(--vtt-text)]"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        
        <label className="mt-4 block relative">
          <span className="mb-1 block text-xs text-[var(--vtt-text-muted)] font-medium">Pregunta</span>
          <textarea
            className="vtt-input min-h-[4.5rem] w-full resize-y text-sm pr-10"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={280}
            placeholder="¿Qué hace el grupo?"
            autoFocus
          />
          <span className="absolute bottom-2 right-2 text-[0.65rem] text-[var(--vtt-text-muted)] opacity-60">
            {question.length}/280
          </span>
        </label>
        
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[var(--vtt-text-muted)] font-medium">Opciones ({opt.length} de 4)</p>
          <div className="space-y-2">
            {opt.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="vtt-input flex-1 text-sm"
                  value={v}
                  onChange={(e) => {
                    const next = [...opt]
                    next[i] = e.target.value
                    setOpt(next)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && question.trim() && opt.filter((x) => x.trim()).length >= 2) {
                      submitNew()
                    }
                  }}
                  maxLength={120}
                  placeholder={`Opción ${i + 1}`}
                />
                {opt.length > 2 && i >= 2 && (
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] text-[var(--vtt-text-muted)] transition-colors hover:border-[var(--vtt-danger-border)] hover:text-[var(--vtt-danger-text)]"
                    onClick={() => handleRemoveOption(i)}
                    aria-label={`Eliminar opción ${i + 1}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {opt.length < 4 && (
            <button
              type="button"
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[var(--vtt-radius-sm)] border border-dashed border-[var(--vtt-border-subtle)] py-1.5 text-xs text-[var(--vtt-text-muted)] transition-colors hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-text)]"
              onClick={handleAddOption}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Añadir opción
            </button>
          )}
        </div>
        
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-[var(--vtt-text-muted)] font-medium">Cierre automático</span>
          <select
            className="vtt-input w-full text-sm"
            value={timeoutSec}
            onChange={(e) => setTimeoutSec(Number(e.target.value))}
          >
            {TIMEOUT_PRESETS.map((p) => (
              <option key={p.label} value={p.sec}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="vtt-btn-secondary text-xs" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vtt-btn-primary ml-auto text-xs"
            onClick={submitNew}
            disabled={!question.trim() || opt.filter((x) => x.trim()).length < 2}
          >
            Iniciar votación
          </button>
        </div>
      </div>
    </div>
  )
}
