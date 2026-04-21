import { useCallback, useEffect, useId, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'

export type DmMapSetupFormProps = {
  socket: Socket
  settings: RoomState['settings']
  sessionPasswordConfigured: boolean
  className?: string
}

export function DmMapSetupForm({
  socket,
  settings,
  sessionPasswordConfigured,
  className = '',
}: DmMapSetupFormProps) {
  const panelId = useId()
  const [bgUrl, setBgUrl] = useState(settings.backgroundUrl)
  const [bgType, setBgType] = useState(settings.backgroundType)
  const [gridSize, setGridSize] = useState(String(settings.gridSize))
  const [snapToGrid, setSnapToGrid] = useState(settings.snapToGrid)
  const [playersCanPing, setPlayersCanPing] = useState(settings.playersCanPing)
  const [showTokenNames, setShowTokenNames] = useState(settings.showTokenNames !== false)
  const [hideNpcNamesFromPlayers, setHideNpcNamesFromPlayers] = useState(
    settings.hideNpcNamesFromPlayers === true,
  )
  const [playersCanRevealImage, setPlayersCanRevealImage] = useState(
    settings.playersCanRevealImage === true,
  )
  const [mesaPwd, setMesaPwd] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const bgUrlId = `${panelId}-bg-url`
  const bgTypeId = `${panelId}-bg-type`
  const gridId = `${panelId}-grid`
  const snapId = `${panelId}-snap`
  const pingId = `${panelId}-ping`
  const tokenNamesId = `${panelId}-token-names`
  const hideNpcNamesId = `${panelId}-hide-npc-names`
  const revealImgId = `${panelId}-reveal-img`
  const mesaPwdId = `${panelId}-mesa-pwd`

  useEffect(() => {
    setBgUrl(settings.backgroundUrl)
    setBgType(settings.backgroundType)
    setGridSize(String(settings.gridSize))
    setSnapToGrid(settings.snapToGrid)
    setPlayersCanPing(settings.playersCanPing)
    setShowTokenNames(settings.showTokenNames !== false)
    setHideNpcNamesFromPlayers(settings.hideNpcNamesFromPlayers === true)
    setPlayersCanRevealImage(settings.playersCanRevealImage === true)
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
      setLocalErr('Escribe un número para el tamaño de casilla (por ejemplo, 50).')
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

  const togglePlayersPing = useCallback(
    (next: boolean) => {
      setPlayersCanPing(next)
      emitSettings({ playersCanPing: next })
    },
    [emitSettings],
  )

  const toggleShowTokenNames = useCallback(
    (next: boolean) => {
      setShowTokenNames(next)
      emitSettings({ showTokenNames: next })
    },
    [emitSettings],
  )

  const toggleHideNpcNames = useCallback(
    (next: boolean) => {
      setHideNpcNamesFromPlayers(next)
      emitSettings({ hideNpcNamesFromPlayers: next })
    },
    [emitSettings],
  )

  const togglePlayersRevealImage = useCallback(
    (next: boolean) => {
      setPlayersCanRevealImage(next)
      emitSettings({ playersCanRevealImage: next })
    },
    [emitSettings],
  )

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
    <div
      className={`dm-setup-scroll vtt-surface vtt-glow-border flex max-h-[min(78svh,820px)] flex-col gap-5 overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] p-5 shadow-[var(--dm-panel-shadow)] ${className}`}
    >
      <header className="dm-setup-hero relative overflow-hidden rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-4 py-4">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rotate-12 rounded-full border border-[var(--vtt-gold-dim)] opacity-25"
          aria-hidden
        />
        <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--vtt-gold-dim)]">
          Cartógrafo
        </p>
        <h2 className="font-vtt-display mt-1 text-lg font-semibold tracking-tight text-[var(--vtt-text)]">
          Mapa y cuadrícula
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--vtt-text-muted)]">
          Define el escenario y la retícula. Los jugadores ven los cambios al instante.
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
          Todos la escriben al entrar a la mesa (es aparte de la clave del Narrador). Deja el campo
          vacío y pulsa «Quitar protección» si quieres que cualquiera pueda entrar sin contraseña.
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
              onChange={(e) => setBgType(e.target.value === 'video' ? 'video' : 'image')}
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
          Mesa
        </legend>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <input
              id={pingId}
              type="checkbox"
              checked={playersCanPing}
              onChange={(e) => togglePlayersPing(e.target.checked)}
              className="mt-1 size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)] focus:ring-[var(--vtt-gold)]"
            />
            <label htmlFor={pingId} className="text-sm text-[var(--vtt-text)]">
              Los jugadores pueden usar Shift+clic para ping en el mapa
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input
              id={tokenNamesId}
              type="checkbox"
              checked={showTokenNames}
              onChange={(e) => toggleShowTokenNames(e.target.checked)}
              className="mt-1 size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)] focus:ring-[var(--vtt-gold)]"
            />
            <label htmlFor={tokenNamesId} className="text-sm text-[var(--vtt-text)]">
              Mostrar nombre bajo cada token en el mapa
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input
              id={hideNpcNamesId}
              type="checkbox"
              checked={hideNpcNamesFromPlayers}
              onChange={(e) => toggleHideNpcNames(e.target.checked)}
              className="mt-1 size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)] focus:ring-[var(--vtt-gold)]"
            />
            <label htmlFor={hideNpcNamesId} className="text-sm text-[var(--vtt-text)]">
              Ocultar nombres reales de PNJ a jugadores y espectadores (solo tú ves el nombre en
              mesa)
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input
              id={revealImgId}
              type="checkbox"
              checked={playersCanRevealImage}
              onChange={(e) => togglePlayersRevealImage(e.target.checked)}
              className="mt-1 size-4 rounded border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] text-[var(--vtt-gold)] focus:ring-[var(--vtt-gold)]"
            />
            <label htmlFor={revealImgId} className="text-sm text-[var(--vtt-text)]">
              Los jugadores pueden mostrar una imagen por URL a toda la mesa (10 s; tú siempre
              puedes)
            </label>
          </div>
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
    </div>
  )
}
