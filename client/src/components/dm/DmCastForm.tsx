import { useCallback, useId, useState } from 'react'
import type { Socket } from 'socket.io-client'

export type DmCastFormProps = {
  socket: Socket
  getSpawnCenter: () => { x: number; y: number }
  className?: string
}

export function DmCastForm({ socket, getSpawnCenter, className = '' }: DmCastFormProps) {
  const panelId = useId()
  const [npcName, setNpcName] = useState('PNJ')
  const [npcImg, setNpcImg] = useState('')
  const [pcName, setPcName] = useState('Héroe')
  const [pcCount, setPcCount] = useState('1')
  const [pcImg, setPcImg] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const npcNameId = `${panelId}-npc-name`
  const npcImgId = `${panelId}-npc-img`
  const pcNameId = `${panelId}-pc-name`
  const pcCountId = `${panelId}-pc-count`
  const pcImgId = `${panelId}-pc-img`

  const spawnNpcOnMap = useCallback(() => {
    setLocalErr(null)
    const { x, y } = getSpawnCenter()
    socket.emit('spawnNpc', {
      x,
      y,
      name: npcName.trim() || 'PNJ',
      img: npcImg.trim() || undefined,
      size: 44,
    })
  }, [getSpawnCenter, npcImg, npcName, socket])

  const spawnNpcReserve = useCallback(() => {
    setLocalErr(null)
    socket.emit('spawnNpc', {
      reserveOnly: true,
      name: npcName.trim() || 'PNJ',
      img: npcImg.trim() || undefined,
      size: 44,
    })
  }, [npcImg, npcName, socket])

  const spawnPc = useCallback(() => {
    setLocalErr(null)
    const n = Number.parseInt(pcCount, 10)
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      setLocalErr('Puedes añadir entre 1 y 12 héroes a la vez. Ajusta el número e inténtalo de nuevo.')
      return
    }
    const { x, y } = getSpawnCenter()
    socket.emit('spawnPc', {
      x,
      y,
      name: pcName.trim() || 'Héroe',
      count: n,
      img: pcImg.trim() || undefined,
      size: 44,
    })
  }, [getSpawnCenter, pcCount, pcImg, pcName, socket])

  return (
    <div
      className={`dm-setup-scroll vtt-surface vtt-glow-border flex max-h-[min(78svh,820px)] flex-col gap-5 overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] p-5 shadow-[var(--dm-panel-shadow)] ${className}`}
    >
      <header className="dm-cast-hero relative overflow-hidden rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-4 py-4">
        <div
          className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-[var(--vtt-gold-glow)] opacity-20 blur-2xl"
          aria-hidden
        />
        <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--vtt-gold-dim)]">
          Elenco
        </p>
        <h2 className="font-vtt-display mt-1 text-lg font-semibold tracking-tight text-[var(--vtt-text)]">
          Personajes y PNJ
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--vtt-text-muted)]">
          Los PNJ puedes guardarlos en reserva (no se ven en el mapa) y sacarlos al combate cuando
          quieras desde el panel derecho. Los PJs nuevos van al centro del mapa.
        </p>
      </header>

      {localErr ? (
        <p
          role="status"
          className="rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-ember)] bg-[var(--vtt-danger-bg)] px-3 py-2 text-xs text-[var(--vtt-danger-text)]"
        >
          {localErr}
        </p>
      ) : null}

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Añadir PNJ
        </legend>
        <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">
          Monstruos, aliados o figuras que solo mueve el DM. La reserva evita llenar el mapa hasta
          que actives cada PNJ.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor={npcNameId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              Nombre
            </label>
            <input
              id={npcNameId}
              type="text"
              value={npcName}
              onChange={(e) => setNpcName(e.target.value)}
              className="vtt-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor={npcImgId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              URL de imagen (opcional)
            </label>
            <input
              id={npcImgId}
              type="url"
              value={npcImg}
              onChange={(e) => setNpcImg(e.target.value)}
              placeholder="Vacío = retrato aleatorio"
              className="vtt-input"
              autoComplete="off"
            />
          </div>
          <button type="button" onClick={spawnNpcReserve} className="vtt-btn-primary w-full">
            Guardar PNJ en reserva
          </button>
          <button type="button" onClick={spawnNpcOnMap} className="vtt-btn-secondary w-full">
            Colocar PNJ en el centro del mapa
          </button>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Personajes (PJ)
        </legend>
        <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">
          Tokens reclamables en el lobby. Varios PJs numeran el nombre base (p. ej. «Guerrero 1»).
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor={pcNameId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              Nombre base
            </label>
            <input
              id={pcNameId}
              type="text"
              value={pcName}
              onChange={(e) => setPcName(e.target.value)}
              className="vtt-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor={pcCountId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              Cantidad (1–12)
            </label>
            <input
              id={pcCountId}
              type="number"
              min={1}
              max={12}
              value={pcCount}
              onChange={(e) => setPcCount(e.target.value)}
              className="vtt-input"
            />
          </div>
          <div>
            <label htmlFor={pcImgId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              URL de imagen (opcional)
            </label>
            <input
              id={pcImgId}
              type="url"
              value={pcImg}
              onChange={(e) => setPcImg(e.target.value)}
              placeholder="Vacío = retrato aleatorio por PJ"
              className="vtt-input"
              autoComplete="off"
            />
          </div>
          <button type="button" onClick={spawnPc} className="vtt-btn-primary w-full">
            Crear personaje(s) en el centro
          </button>
        </div>
      </fieldset>
    </div>
  )
}
