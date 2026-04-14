import { useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { DiceMode, DieType, RoomState } from '../../types/room'

const DIE_OPTIONS: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

type DicePanelProps = {
  socket: Socket
  roomState: RoomState
  isDm: boolean
  /** Para etiquetar tiradas ocultas del propio jugador. */
  playerSessionId?: string | null
  /** Jugador con personaje: puede pedir permiso de tirada al DM. */
  canRequestRoll?: boolean
  /** `dock`: columna del DM sin posición fija. */
  layout?: 'floating' | 'dock'
  /** Envuelto en `DmCollapsibleCard`: sin cabecera propia, contenido siempre visible. */
  nestedInHud?: boolean
}

function modeLabel(mode: DiceMode): string {
  if (mode === 'advantage') return 'Ventaja'
  if (mode === 'disadvantage') return 'Desventaja'
  return 'Normal'
}

export function DicePanel({
  socket,
  roomState,
  isDm,
  playerSessionId = null,
  canRequestRoll = false,
  layout = 'floating',
  nestedInHud = false,
}: DicePanelProps) {
  const [dieType, setDieType] = useState<DieType>('d20')
  const [mode, setMode] = useState<DiceMode>('normal')
  const [secretRoll, setSecretRoll] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [rollReason, setRollReason] = useState('')

  const recentRolls = useMemo(() => roomState.diceLog.slice(0, 8), [roomState.diceLog])
  const isD20 = dieType === 'd20'

  const onRoll = () => {
    socket.emit('diceRoll', {
      dieType,
      mode: isD20 ? mode : 'normal',
      secret: secretRoll,
    })
  }

  const onRequestRoll = () => {
    socket.emit('rollRequest', {
      dieType,
      mode: isD20 ? mode : 'normal',
      reason: rollReason.trim(),
    })
  }

  const shellClass =
    layout === 'dock'
      ? nestedInHud
        ? 'relative z-auto w-full flex flex-col'
        : 'relative z-auto w-full flex flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 shadow-lg backdrop-blur-sm'
      : 'fixed right-3 top-24 z-30 w-[min(24rem,calc(100vw-1.5rem))] flex flex-col rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[var(--vtt-bg)]/95 shadow-lg backdrop-blur-sm'

  const showInnerHeader = !(layout === 'dock' && nestedInHud)
  const innerExpanded = nestedInHud ? true : expanded

  return (
    <section className={shellClass} aria-label="Dados virtuales">
      {showInnerHeader ? (
        <button
          type="button"
          className="vtt-surface vtt-glow-border flex w-full items-center justify-between rounded-t-[var(--vtt-radius)] border-0 border-b border-[var(--vtt-border-subtle)] bg-transparent px-3 py-2 text-left font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)] hover:bg-[var(--vtt-surface-warm)]"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={expanded ? 'dice-panel-contenido' : undefined}
          id="dice-panel-cabecera"
        >
          Dados virtuales
          <span className="text-[var(--vtt-text-muted)]" aria-hidden="true">
            {expanded ? '−' : '+'}
          </span>
        </button>
      ) : null}
      {innerExpanded ? (
        <div
          id="dice-panel-contenido"
          className={
            nestedInHud && layout === 'dock'
              ? 'vtt-surface vtt-glow-border border-0 p-3 pt-2'
              : 'vtt-surface vtt-glow-border border-0 p-3 pt-2'
          }
          role="region"
          aria-labelledby={showInnerHeader ? 'dice-panel-cabecera' : undefined}
        >
          <div className="grid grid-cols-2 gap-2">
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

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[var(--vtt-text-muted)]">
            <input
              type="checkbox"
              checked={secretRoll}
              onChange={(e) => setSecretRoll(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)]"
            />
            <span>
              Tirada oculta: solo el director ve el resultado en la mesa
              {!isDm ? ' (tú también ves tu tirada).' : '.'}
            </span>
          </label>

          <button type="button" className="vtt-btn-primary mt-3 w-full text-xs" onClick={onRoll}>
            Tirar {dieType}
          </button>

          {!isDm && canRequestRoll ? (
            <div className="mt-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)]/80 p-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
                Pedir permiso al director
              </p>
              <label className="mt-2 block text-xs text-[var(--vtt-text-muted)]">
                Motivo
                <textarea
                  className="vtt-input mt-1 min-h-[3.25rem] w-full resize-y text-[var(--vtt-text)]"
                  rows={2}
                  maxLength={400}
                  placeholder="Ej.: ¿Puedo tirar Percepción para el pasillo?"
                  value={rollReason}
                  onChange={(e) => setRollReason(e.target.value)}
                  aria-label="Motivo de la solicitud de tirada"
                />
              </label>
              <p className="mt-1 text-[0.65rem] text-[var(--vtt-text-muted)]">
                Se usa el dado y modo seleccionados arriba. El DM verá la petición y puede aprobarla
                o ignorarla.
              </p>
              <button
                type="button"
                className="vtt-btn-secondary mt-2 w-full text-xs"
                onClick={onRequestRoll}
              >
                Enviar solicitud
              </button>
            </div>
          ) : null}

          <div className="mt-3 border-t border-[var(--vtt-border-subtle)] pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--vtt-text-muted)]">
              Historial
            </p>
            {recentRolls.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--vtt-text-muted)]">Aún no hay tiradas.</p>
            ) : (
              <ol className="mt-2 grid max-h-40 gap-1 overflow-auto pr-1">
                {recentRolls.map((roll) => {
                  const isOwnSecretPlayer =
                    Boolean(roll.secret) &&
                    !isDm &&
                    playerSessionId &&
                    roll.playerSessionId === playerSessionId
                  const showDmSecretBadge = Boolean(roll.secret) && isDm
                  return (
                    <li
                      key={roll.id}
                      className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] px-2 py-1 text-xs text-[var(--vtt-text)]"
                    >
                      <span className="font-semibold text-[var(--vtt-gold)]">{roll.roller}</span>{' '}
                      tira {roll.dieType} ({modeLabel(roll.mode)}):{' '}
                      {roll.rolls.length > 1 ? `${roll.rolls.join('/')} → ` : ''}
                      <span className="font-semibold">{roll.total}</span>
                      {showDmSecretBadge ? (
                        <span
                          className="ml-1.5 inline-block rounded-sm border border-[var(--vtt-gold-dim)] bg-[var(--vtt-surface-warm)] px-1.5 py-0.5 font-vtt-display text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--vtt-gold)]"
                          title="Los demás jugadores no ven esta tirada en el historial"
                        >
                          Oculta
                        </span>
                      ) : null}
                      {isOwnSecretPlayer ? (
                        <span className="ml-1 text-[0.65rem] text-[var(--vtt-text-muted)]">
                          (no visible para el resto)
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
