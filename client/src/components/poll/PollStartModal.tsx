import { useCallback, useId, useState } from 'react'
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
  const [opt, setOpt] = useState(['', '', '', ''])
  const [timeoutSec, setTimeoutSec] = useState(0)

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
    setOpt(['', '', '', ''])
    setTimeoutSec(0)
  }, [opt, onClose, question, socket, timeoutSec])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="vtt-surface vtt-glow-border max-h-[min(90svh,36rem)] w-full max-w-md overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={modalTitleId}
          className="font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)]"
        >
          Nueva votación
        </h2>
        <label className="mt-3 block text-xs text-[var(--vtt-text-muted)]">
          Pregunta
          <textarea
            className="vtt-input mt-1 min-h-[4rem] w-full resize-y text-sm"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={280}
            placeholder="¿Qué hace el grupo?"
          />
        </label>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[var(--vtt-text-muted)]">Opciones (2 a 4)</p>
          {opt.map((v, i) => (
            <input
              key={i}
              className="vtt-input w-full text-sm"
              value={v}
              onChange={(e) => {
                const next = [...opt]
                next[i] = e.target.value
                setOpt(next)
              }}
              maxLength={120}
              placeholder={`Opción ${i + 1}`}
            />
          ))}
        </div>
        <label className="mt-3 block text-xs text-[var(--vtt-text-muted)]">
          Cierre automático
          <select
            className="vtt-input mt-1 w-full text-sm"
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
        <div className="mt-5 flex flex-wrap gap-2">
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
