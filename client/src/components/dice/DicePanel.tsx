import { useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { DiceMode, DieType, RoomState } from '../../types/room'

const DIE_OPTIONS: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

type DicePanelProps = {
  socket: Socket
  roomState: RoomState
}

function modeLabel(mode: DiceMode): string {
  if (mode === 'advantage') return 'Ventaja'
  if (mode === 'disadvantage') return 'Desventaja'
  return 'Normal'
}

export function DicePanel({ socket, roomState }: DicePanelProps) {
  const [dieType, setDieType] = useState<DieType>('d20')
  const [mode, setMode] = useState<DiceMode>('normal')

  const recentRolls = useMemo(() => roomState.diceLog.slice(0, 8), [roomState.diceLog])
  const isD20 = dieType === 'd20'

  const onRoll = () => {
    socket.emit('diceRoll', {
      dieType,
      mode: isD20 ? mode : 'normal',
    })
  }

  return (
    <section className="fixed right-3 top-24 z-30 w-[min(24rem,calc(100vw-1.5rem))]">
      <div className="vtt-surface vtt-glow-border rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 p-3 backdrop-blur-sm">
        <h3 className="font-vtt-display text-sm tracking-wide text-[var(--vtt-gold)]">
          Dados virtuales
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--vtt-text-muted)]">
            Dado
            <select
              className="vtt-input mt-1"
              value={dieType}
              onChange={(e) => setDieType(e.target.value as DieType)}
            >
              {DIE_OPTIONS.map((die) => (
                <option key={die} value={die}>
                  {die}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--vtt-text-muted)]">
            Modo
            <select
              className="vtt-input mt-1"
              value={mode}
              onChange={(e) => setMode(e.target.value as DiceMode)}
              disabled={!isD20}
            >
              <option value="normal">Normal</option>
              <option value="advantage">Ventaja</option>
              <option value="disadvantage">Desventaja</option>
            </select>
          </label>
        </div>

        <button type="button" className="vtt-btn-primary mt-3 w-full text-xs" onClick={onRoll}>
          Tirar {dieType}
        </button>

        <div className="mt-3 border-t border-[var(--vtt-border-subtle)] pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
            Historial
          </p>
          {recentRolls.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--vtt-text-muted)]">Aún no hay tiradas.</p>
          ) : (
            <ol className="mt-2 grid max-h-40 gap-1 overflow-auto pr-1">
              {recentRolls.map((roll) => (
                <li
                  key={roll.id}
                  className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] px-2 py-1 text-xs text-[var(--vtt-text)]"
                >
                  <span className="font-semibold text-[var(--vtt-gold)]">{roll.roller}</span>{' '}
                  tira {roll.dieType} ({modeLabel(roll.mode)}):{' '}
                  {roll.rolls.length > 1 ? `${roll.rolls.join('/')} -> ` : ''}
                  <span className="font-semibold">{roll.total}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
