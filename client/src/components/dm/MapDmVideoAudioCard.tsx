import { useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'

type MapDmVideoAudioCardProps = {
  socket: Socket
  roomState: RoomState
  /** Dentro de `DmCollapsibleCard`: oculta el título duplicado. */
  embedded?: boolean
}

/**
 * Controles de audio del vídeo de mapa (misma lógica que el recuadro del tablero, para la columna del DM).
 */
export function MapDmVideoAudioCard({
  socket,
  roomState,
  embedded = false,
}: MapDmVideoAudioCardProps) {
  const { backgroundUrl, backgroundType, mapAudioEnabled } = roomState.settings
  const mapVolume = Math.min(100, Math.max(0, Math.round(roomState.settings.mapVolume ?? 70)))
  const hasMedia = Boolean(backgroundUrl?.trim())
  const isVideo = hasMedia && backgroundType === 'video'

  const updateRoomSettingAsDm = useCallback(
    (partial: Partial<RoomState['settings']>) => {
      socket.emit('updateRoomSettings', partial)
    },
    [socket],
  )

  const updateRoomMapVolume = useCallback(
    (next: number) => {
      updateRoomSettingAsDm({
        mapVolume: Math.min(100, Math.max(0, Math.round(next))),
      })
    },
    [updateRoomSettingAsDm],
  )

  const toggleRoomMapAudio = useCallback(() => {
    updateRoomSettingAsDm({ mapAudioEnabled: !mapAudioEnabled })
  }, [mapAudioEnabled, updateRoomSettingAsDm])

  if (!isVideo) {
    return (
      <div className="vtt-surface vtt-glow-border rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-3 py-2">
        {embedded ? null : (
          <p className="font-vtt-display text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--vtt-gold-dim)]">
            Audio del mapa
          </p>
        )}
        <p
          className={`text-xs leading-relaxed text-[var(--vtt-text-muted)] ${embedded ? '' : 'mt-1'}`}
        >
          Solo aplica cuando el fondo de la escena es vídeo (archivo o YouTube).
        </p>
      </div>
    )
  }

  return (
    <div className="vtt-surface vtt-glow-border flex flex-col gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-3 py-2">
      {embedded ? null : (
        <p className="font-vtt-display text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--vtt-gold-dim)]">
          Audio del mapa
        </p>
      )}
      <button
        type="button"
        aria-label={
          mapAudioEnabled ? 'Desactivar audio del vídeo de mapa' : 'Activar audio del vídeo de mapa'
        }
        className="font-vtt-display rounded-md border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] transition hover:border-[var(--vtt-gold-dim)]"
        onClick={toggleRoomMapAudio}
      >
        {mapAudioEnabled ? 'Desactivar audio del mapa' : 'Activar audio del mapa'}
      </button>
      <label className="flex items-center gap-2 text-xs text-[var(--vtt-text-muted)]">
        <span className="font-vtt-display shrink-0 uppercase tracking-wide">Vol</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={mapVolume}
          onChange={(e) => updateRoomMapVolume(Number(e.target.value))}
          className="w-full accent-[var(--vtt-gold)]"
          aria-label="Volumen del vídeo del mapa"
        />
        <span className="w-8 text-right text-[var(--vtt-text)]">{mapVolume}</span>
      </label>
    </div>
  )
}
