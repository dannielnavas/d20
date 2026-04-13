import { useCallback, useEffect, useId, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'

export type DmDrawerProps = {
  socket: Socket
  settings: RoomState['settings']
  sessionPasswordConfigured: boolean
  getSpawnCenter: () => { x: number; y: number }
}

export function DmDrawer({
  socket,
  settings,
  sessionPasswordConfigured,
  getSpawnCenter,
}: DmDrawerProps) {
  const panelId = useId()
  const [bgUrl, setBgUrl] = useState(settings.backgroundUrl)
  const [bgType, setBgType] = useState(settings.backgroundType)
  const [gridSize, setGridSize] = useState(String(settings.gridSize))
  const [snapToGrid, setSnapToGrid] = useState(settings.snapToGrid)
  const [npcName, setNpcName] = useState('PNJ')
  const [npcImg, setNpcImg] = useState('')
  const [pcName, setPcName] = useState('Héroe')
  const [pcCount, setPcCount] = useState('1')
  const [pcImg, setPcImg] = useState('')
  const [mesaPwd, setMesaPwd] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const bgUrlId = `${panelId}-bg-url`
  const bgTypeId = `${panelId}-bg-type`
  const gridId = `${panelId}-grid`
  const snapId = `${panelId}-snap`
  const npcNameId = `${panelId}-npc-name`
  const npcImgId = `${panelId}-npc-img`
  const pcNameId = `${panelId}-pc-name`
  const pcCountId = `${panelId}-pc-count`
  const pcImgId = `${panelId}-pc-img`
  const mesaPwdId = `${panelId}-mesa-pwd`

  useEffect(() => {
    setBgUrl(settings.backgroundUrl)
    setBgType(settings.backgroundType)
    setGridSize(String(settings.gridSize))
    setSnapToGrid(settings.snapToGrid)
  }, [settings])

  const emitSettings = useCallback(
    (partial: Partial<RoomState['settings']>) => {
      setLocalErr(null)
      socket.emit('updateRoomSettings', partial)
    },
    [socket],
  )

  const applyBackground = useCallback(() => {
    emitSettings({
      backgroundUrl: bgUrl,
      backgroundType: bgType,
    })
  }, [bgUrl, bgType, emitSettings])

  const applyGridSize = useCallback(() => {
    const n = Number.parseInt(gridSize, 10)
    if (!Number.isFinite(n)) {
      setLocalErr('Tamaño de cuadrícula inválido')
      return
    }
    emitSettings({ gridSize: n })
  }, [emitSettings, gridSize])

  const toggleSnap = useCallback(
    (next: boolean) => {
      setSnapToGrid(next)
      emitSettings({ snapToGrid: next })
    },
    [emitSettings],
  )

  const spawnNpc = useCallback(() => {
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

  const spawnPc = useCallback(() => {
    setLocalErr(null)
    const n = Number.parseInt(pcCount, 10)
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      setLocalErr('Cantidad de personajes: entre 1 y 12')
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

  const applySessionPassword = useCallback(() => {
    setLocalErr(null)
    const t = mesaPwd.trim()
    if (t.length < 4) {
      setLocalErr('Escribe al menos 4 caracteres o usa «Quitar protección».')
      return
    }
    socket.emit('setSessionPassword', { password: t })
    setMesaPwd('')
  }, [mesaPwd, socket])

  const clearSessionPassword = useCallback(() => {
    setLocalErr(null)
    socket.emit('setSessionPassword', { password: '' })
    setMesaPwd('')
  }, [socket])

  return (
    <aside
      className="vtt-surface vtt-glow-border flex w-full shrink-0 flex-col gap-5 p-5 lg:w-80 lg:max-w-[min(100%,20rem)]"
      aria-labelledby={`${panelId}-titulo`}
    >
      <header>
        <h2
          id={`${panelId}-titulo`}
          className="font-vtt-display text-sm font-semibold uppercase tracking-[0.22em] text-[var(--vtt-gold)]"
        >
          Herramientas del DM
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--vtt-text-muted)]">
          Los cambios se aplican en vivo para todos los jugadores conectados.
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
          Contraseña de la mesa
        </legend>
        <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">
          Jugadores y DM deben usarla para entrar (además de la clave de DM). Deja el campo vacío
          y pulsa «Quitar» para abrir la mesa sin contraseña.
        </p>
        <p className="mt-2 text-xs font-medium text-[var(--vtt-text)]">
          Estado:{' '}
          {sessionPasswordConfigured ? (
            <span className="text-[var(--vtt-forest)]">Protegida</span>
          ) : (
            <span className="text-[var(--vtt-text-muted)]">Sin contraseña</span>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor={mesaPwdId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              Nueva contraseña (4–128 caracteres)
            </label>
            <input
              id={mesaPwdId}
              type="password"
              value={mesaPwd}
              onChange={(e) => setMesaPwd(e.target.value)}
              autoComplete="new-password"
              className="vtt-input"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={applySessionPassword} className="vtt-btn-primary flex-1">
              Establecer o cambiar
            </button>
            <button
              type="button"
              onClick={clearSessionPassword}
              className="vtt-btn-secondary flex-1"
            >
              Quitar protección
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Mapa base
        </legend>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor={bgUrlId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              URL (imagen, vídeo .mp4/webm o enlace de YouTube)
            </label>
            <input
              id={bgUrlId}
              type="url"
              value={bgUrl}
              onChange={(e) => setBgUrl(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
              className="vtt-input"
            />
          </div>
          <div>
            <label htmlFor={bgTypeId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
              Tipo de medio
            </label>
            <select
              id={bgTypeId}
              value={bgType}
              onChange={(e) =>
                setBgType(e.target.value === 'video' ? 'video' : 'image')
              }
              className="vtt-input"
            >
              <option value="image">Imagen estática</option>
              <option value="video">Vídeo en bucle</option>
            </select>
          </div>
          <button type="button" onClick={applyBackground} className="vtt-btn-primary w-full">
            Aplicar fondo
          </button>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Cuadrícula
        </legend>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <input
              id={snapId}
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => toggleSnap(e.target.checked)}
              className="mt-1 size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)] focus:ring-[var(--vtt-gold)]"
            />
            <label htmlFor={snapId} className="text-sm text-[var(--vtt-text)]">
              Ajustar tokens a la cuadrícula al soltar
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[6rem] flex-1">
              <label htmlFor={gridId} className="text-xs font-medium text-[var(--vtt-text-muted)]">
                Tamaño de celda (px)
              </label>
              <input
                id={gridId}
                type="number"
                min={8}
                max={200}
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value)}
                className="vtt-input"
              />
            </div>
            <button
              type="button"
              onClick={applyGridSize}
              className="vtt-btn-secondary shrink-0 px-4 py-2"
            >
              Aplicar
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Añadir PNJ
        </legend>
        <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">
          Aparece en el centro del tablero (coordenadas del mapa).
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
          <button type="button" onClick={spawnNpc} className="vtt-btn-secondary w-full">
            Crear PNJ en el centro
          </button>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="font-vtt-display w-full border-b border-[var(--vtt-border-subtle)] pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
          Personajes (PJ)
        </legend>
        <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">
          Crea uno o varios tokens reclamables en el lobby. Si pones varios, el nombre base se
          numera (p. ej. «Guerrero 1», «Guerrero 2»).
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
    </aside>
  )
}
