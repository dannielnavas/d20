import type { Token } from '../../types/room'

export type CharacterLobbyProps = {
  roomId: string
  pcs: Token[]
  claimingId: string | null
  onClaim: (tokenId: string) => void
}

export function CharacterLobby({
  roomId,
  pcs,
  claimingId,
  onClaim,
}: CharacterLobbyProps) {
  const busyGlobal = claimingId !== null

  return (
    <section
      className="vtt-surface vtt-glow-border mx-auto w-full max-w-lg px-6 py-8 md:px-10"
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
          Sala{' '}
          <span className="font-mono text-[var(--vtt-gold)]">{roomId}</span>. Solo moverás el
          token que elijas. Los personajes ya reclamados no están disponibles.
        </p>
      </header>

      <ul className="mt-8 flex flex-col gap-4">
        {pcs.map((pc) => {
          const taken = pc.claimedBy !== null
          const busy = taken
          const disabled = busy || busyGlobal

          const statusLabel = busy ? 'No disponible, en uso' : 'Disponible para elegir'

          return (
            <li key={pc.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onClaim(pc.id)}
                aria-label={
                  busy
                    ? `${pc.name}, ocupado por otro jugador`
                    : `${pc.name}, disponible. Elegir como personaje.`
                }
                aria-describedby={`${pc.id}-estado`}
                className="group flex w-full items-center gap-4 rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] p-4 text-left transition-[border-color,box-shadow] duration-200 hover:border-[var(--vtt-border)] hover:shadow-[0_0_0_1px_var(--vtt-gold-glow)] disabled:pointer-events-none disabled:opacity-45"
              >
                <div
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[var(--vtt-border)] bg-[var(--vtt-surface)]"
                  aria-hidden
                >
                  {pc.img ? (
                    <img
                      src={pc.img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
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
                  <p
                    id={`${pc.id}-estado`}
                    className="mt-1 text-xs text-[var(--vtt-text-muted)]"
                  >
                    {statusLabel}
                  </p>
                </div>
                <span className="font-vtt-display shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--vtt-gold-dim)] group-hover:text-[var(--vtt-gold)] group-disabled:text-[var(--vtt-text-muted)]">
                  {claimingId === pc.id ? 'Uniendo…' : busy ? 'Ocupado' : 'Elegir'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {pcs.length === 0 && (
        <p
          className="mt-8 text-center text-sm text-[var(--vtt-text-muted)]"
          role="status"
        >
          No hay personajes en esta sala. Pide al DM que añada PJs o prueba la sala{' '}
          <span className="font-mono text-[var(--vtt-gold)]">demo</span>.
        </p>
      )}
    </section>
  )
}
