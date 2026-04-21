import { useState } from 'react'
import { DEFAULT_TOKEN_FRAME_COLOR, TOKEN_FRAME_COLORS } from '../../config/tokenFrameColors'
import type { Token } from '../../types/room'

export type CharacterClaimCustomization = {
  img: string
  frameColor: string
  hitPointsCurrent: number
  hitPointsMax: number
  hitPointsTemp: number
}

export type CharacterLobbyProps = {
  roomId: string
  pcs: Token[]
  claimingId: string | null
  onClaim: (tokenId: string, customization: CharacterClaimCustomization) => void
}

function buildDefaultDraft(pc: Token): CharacterClaimCustomization {
  return {
    img: pc.img ?? '',
    frameColor: pc.frameColor ?? DEFAULT_TOKEN_FRAME_COLOR,
    hitPointsCurrent: pc.hitPointsCurrent ?? 0,
    hitPointsMax: pc.hitPointsMax ?? 0,
    hitPointsTemp: pc.hitPointsTemp ?? 0,
  }
}

export function CharacterLobby({ roomId, pcs, claimingId, onClaim }: CharacterLobbyProps) {
  const busyGlobal = claimingId !== null
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CharacterClaimCustomization>>({})

  const getDraft = (pc: Token) => drafts[pc.id] ?? buildDefaultDraft(pc)

  const updateDraft = (pc: Token, patch: Partial<CharacterClaimCustomization>) => {
    setDrafts((prev) => ({
      ...prev,
      [pc.id]: {
        ...(prev[pc.id] ?? buildDefaultDraft(pc)),
        ...patch,
      },
    }))
  }

  return (
    <section
      className="vtt-surface vtt-glow-border mx-auto w-full max-w-3xl px-6 py-8 md:px-10"
      aria-labelledby="lobby-titulo"
      aria-busy={busyGlobal}
    >
      <header className="border-b border-[var(--vtt-border-subtle)] pb-6">
        <h2
          id="lobby-titulo"
          className="font-vtt-display text-2xl font-semibold tracking-tight text-[var(--vtt-text)]"
        >
          Elige tu personaje
        </h2>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-[var(--vtt-text-muted)]">
          Sala <span className="font-mono text-[var(--vtt-gold)]">{roomId}</span>. Puedes ajustar
          retrato, marco de cámara y puntos de golpe antes de entrar. Los personajes ya elegidos
          aparecen como ocupados.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {pcs.map((pc) => {
          const taken = pc.claimedBy !== null
          const disabled = taken || busyGlobal
          const draft = getDraft(pc)
          const statusLabel = taken ? 'No disponible, en uso' : 'Disponible para elegir'

          return (
            <li key={pc.id}>
              <div className="rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.16)]">
                <div className="flex items-center gap-4">
                  <div
                    className="relative shrink-0 overflow-hidden rounded-[1.15rem] border-[3px] bg-[var(--vtt-surface)]"
                    style={{ borderColor: draft.frameColor, width: '4.5rem', height: '4.5rem' }}
                    aria-hidden
                  >
                    {draft.img ? (
                      <img src={draft.img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-vtt-display text-lg text-[var(--vtt-gold)]">
                        {pc.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-vtt-display text-lg font-medium text-[var(--vtt-text)]">
                      {pc.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--vtt-text-muted)]">{statusLabel}</p>
                    <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--vtt-gold-dim)]">
                      HP {draft.hitPointsCurrent}/{draft.hitPointsMax} · +{draft.hitPointsTemp}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-gold)] disabled:opacity-45"
                    onClick={() => setExpandedId((prev) => (prev === pc.id ? null : pc.id))}
                    disabled={disabled}
                  >
                    {expandedId === pc.id ? 'Ocultar edición' : 'Personalizar'}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onClaim(pc.id, draft)}
                    className="vtt-btn-primary disabled:pointer-events-none disabled:opacity-45"
                  >
                    {claimingId === pc.id ? 'Uniendo…' : taken ? 'Ocupado' : 'Elegir'}
                  </button>
                </div>

                {expandedId === pc.id ? (
                  <div className="mt-4 space-y-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] p-3">
                    <label className="block text-[0.72rem] text-[var(--vtt-text-muted)]">
                      Imagen del personaje
                      <input
                        type="url"
                        className="vtt-input mt-1 text-sm"
                        value={draft.img}
                        onChange={(e) => updateDraft(pc, { img: e.target.value })}
                        placeholder="https://…"
                        maxLength={2000}
                      />
                    </label>

                    <div>
                      <p className="text-[0.72rem] text-[var(--vtt-text-muted)]">Marco de cámara</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {TOKEN_FRAME_COLORS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`h-8 w-8 rounded-full border-2 transition ${draft.frameColor === option.value ? 'scale-110 border-[var(--vtt-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : 'border-transparent opacity-85 hover:opacity-100'}`}
                            style={{ backgroundColor: option.value }}
                            title={option.label}
                            onClick={() => updateDraft(pc, { frameColor: option.value })}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-[0.72rem] text-[var(--vtt-text-muted)]">
                        Actuales
                        <input
                          type="number"
                          min={0}
                          className="vtt-input mt-1 text-sm"
                          value={draft.hitPointsCurrent}
                          onChange={(e) =>
                            updateDraft(pc, {
                              hitPointsCurrent: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </label>
                      <label className="text-[0.72rem] text-[var(--vtt-text-muted)]">
                        Máximos
                        <input
                          type="number"
                          min={0}
                          className="vtt-input mt-1 text-sm"
                          value={draft.hitPointsMax}
                          onChange={(e) =>
                            updateDraft(pc, {
                              hitPointsMax: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </label>
                      <label className="text-[0.72rem] text-[var(--vtt-text-muted)]">
                        Temporales
                        <input
                          type="number"
                          min={0}
                          className="vtt-input mt-1 text-sm"
                          value={draft.hitPointsTemp}
                          onChange={(e) =>
                            updateDraft(pc, {
                              hitPointsTemp: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {pcs.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--vtt-text-muted)]" role="status">
          No hay personajes en esta sala. Pide al Narrador que añada héroes o prueba la sala{' '}
          <span className="font-mono text-[var(--vtt-gold)]">demo</span>.
        </p>
      ) : null}
    </section>
  )
}
