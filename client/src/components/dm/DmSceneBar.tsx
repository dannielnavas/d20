import { useCallback, useId } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'

export type DmSceneBarProps = {
  socket: Socket
  roomState: RoomState
  className?: string
}

export function DmSceneBar({ socket, roomState, className = '' }: DmSceneBarProps) {
  const baseId = useId()
  const selectId = `${baseId}-scene`

  const onSelect = useCallback(
    (sceneId: string) => {
      socket.emit('setActiveScene', { sceneId })
    },
    [socket],
  )

  const addScene = useCallback(() => {
    socket.emit('addScene', { name: `Escena ${roomState.scenes.length + 1}`, activate: true })
  }, [roomState.scenes.length, socket])

  const deleteCurrent = useCallback(() => {
    socket.emit('deleteScene', { sceneId: roomState.activeSceneId })
  }, [roomState.activeSceneId, socket])

  const canDelete = roomState.scenes.length > 1

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface-warm)] px-3 py-2 ${className}`}
    >
      <label htmlFor={selectId} className="text-[0.65rem] font-semibold text-[var(--vtt-gold-dim)]">
        Escena
      </label>
      <select
        id={selectId}
        className="vtt-input max-w-[12rem] py-1.5 text-xs"
        value={roomState.activeSceneId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {roomState.scenes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="button" className="vtt-btn-secondary px-2 py-1.5 text-xs" onClick={addScene}>
        + Nueva
      </button>
      {canDelete ? (
        <button type="button" className="vtt-btn-secondary px-2 py-1.5 text-xs" onClick={deleteCurrent}>
          Borrar (vacía)
        </button>
      ) : null}
    </div>
  )
}
