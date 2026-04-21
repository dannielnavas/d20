import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { DEFAULT_TOKEN_FRAME_COLOR, TOKEN_FRAME_COLORS } from '../../config/tokenFrameColors'
import type { Token } from '../../types/room'
import {
  DD_TOKEN_SIZE_LABELS,
  DD_TOKEN_SIZE_MULTIPLIERS,
  type DdTokenSizeCategory,
  ddCategoryFromPixelSize,
  ddSizeCategoriesOrdered,
  pixelSizeFromDdCategory,
} from '../../utils/ddTokenSizes'

export type DmTokenRosterProps = {
  tokens: Token[]
  /** Lado de casilla del mapa (px); define el tamaño de ficha por categoría D&D. */
  gridSize: number
  /** Para editar condiciones y activar PNJ en reserva. */
  socket?: Socket
  /** Centro del mapa al sacar un PNJ de la reserva. */
  getSpawnCenter: () => { x: number; y: number }
  className?: string
}

export function DmTokenRoster({
  tokens,
  gridSize,
  socket,
  getSpawnCenter,
  className = '',
}: DmTokenRosterProps) {
  const { onMap, inReserve } = useMemo(() => {
    const onMapList: Token[] = []
    const reserveList: Token[] = []
    for (const t of tokens) {
      if (t.type === 'npc' && t.onMap === false) reserveList.push(t)
      else onMapList.push(t)
    }
    onMapList.sort(sortTokens)
    reserveList.sort(sortTokens)
    return { onMap: onMapList, inReserve: reserveList }
  }, [tokens])

  return (
    <div
      className={`dm-setup-scroll flex max-h-[min(78svh,820px)] min-h-[12rem] flex-col gap-6 overflow-y-auto rounded-[var(--vtt-radius)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-surface)] p-5 shadow-[var(--dm-panel-shadow)] ${className}`}
    >
      <header>
        <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--vtt-gold-dim)]">
          En mesa
        </p>
        <h3 className="font-vtt-display mt-1 text-lg font-semibold text-[var(--vtt-text)]">
          Fichas en el mapa
        </h3>
        <p className="mt-2 text-xs text-[var(--vtt-text-muted)]">
          {onMap.length === 0
            ? 'Aún no hay fichas visibles. Crea PJs o PNJ desde el formulario.'
            : `${onMap.length} ficha${onMap.length === 1 ? '' : 's'} visibles.`}
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {onMap.map((t) => (
          <TokenRosterRow
            key={t.id}
            token={t}
            gridSize={gridSize}
            socket={socket}
            getSpawnCenter={getSpawnCenter}
            showBenchAction={t.type === 'npc'}
          />
        ))}
      </ul>

      <div>
        <header className="border-t border-[var(--vtt-border-subtle)] pt-5">
          <p className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--vtt-gold-dim)]">
            Reserva
          </p>
          <h3 className="font-vtt-display mt-1 text-base font-semibold text-[var(--vtt-text)]">
            PNJ sin mostrar en mapa
          </h3>
          <p className="mt-2 text-xs text-[var(--vtt-text-muted)]">
            Actívalos cuando entren en escena; aparecerán en el centro del mapa (vista Mesa).
          </p>
        </header>
        {inReserve.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--vtt-text-muted)]">No hay PNJ en reserva.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {inReserve.map((t) => (
              <TokenRosterRow
                key={t.id}
                token={t}
                gridSize={gridSize}
                socket={socket}
                getSpawnCenter={getSpawnCenter}
                showBenchAction={false}
                isInReserve
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function sortTokens(a: Token, b: Token): number {
  if (a.type !== b.type) return a.type === 'pc' ? -1 : 1
  return a.name.localeCompare(b.name, 'es')
}

type RowProps = {
  token: Token
  gridSize: number
  socket?: Socket
  getSpawnCenter: () => { x: number; y: number }
  /** Mostrar “A reserva” solo para PNJ ya en mapa. */
  showBenchAction: boolean
  isInReserve?: boolean
}

function TokenRosterRow({
  token: t,
  gridSize,
  socket,
  getSpawnCenter,
  showBenchAction,
  isInReserve = false,
}: RowProps) {
  const rowId = useId()
  const isPc = t.type === 'pc'
  const claimed = isPc && t.claimedBy !== null
  let status: string
  if (isInReserve) {
    status = 'En reserva (no visible)'
  } else if (!isPc) {
    status = 'PNJ en mapa'
  } else if (claimed) {
    status = 'En juego'
  } else {
    status = 'Libre en lobby'
  }

  const [draft, setDraft] = useState(() => (t.conditions ?? []).join(', '))
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(t.name)
  const [editImg, setEditImg] = useState(t.img ?? '')
  const [editFrameColor, setEditFrameColor] = useState(t.frameColor ?? DEFAULT_TOKEN_FRAME_COLOR)
  const [editHpCurrent, setEditHpCurrent] = useState(t.hitPointsCurrent ?? 0)
  const [editHpMax, setEditHpMax] = useState(t.hitPointsMax ?? 0)
  const [editHpTemp, setEditHpTemp] = useState(t.hitPointsTemp ?? 0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setDraft((t.conditions ?? []).join(', '))
  }, [t.conditions, t.id])

  useEffect(() => {
    if (!editing) {
      setEditName(t.name)
      setEditImg(t.img ?? '')
      setEditFrameColor(t.frameColor ?? DEFAULT_TOKEN_FRAME_COLOR)
      setEditHpCurrent(t.hitPointsCurrent ?? 0)
      setEditHpMax(t.hitPointsMax ?? 0)
      setEditHpTemp(t.hitPointsTemp ?? 0)
    }
  }, [t.name, t.img, t.frameColor, t.hitPointsCurrent, t.hitPointsMax, t.hitPointsTemp, editing])

  const applyConditions = useCallback(() => {
    if (!socket) return
    const conditions = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
    socket.emit('tokenSetConditions', { tokenId: t.id, conditions })
  }, [draft, socket, t.id])

  const activateReserve = useCallback(() => {
    if (!socket) return
    const { x, y } = getSpawnCenter()
    socket.emit('npcSetOnMap', { tokenId: t.id, onMap: true, x, y })
  }, [getSpawnCenter, socket, t.id])

  const sendToBench = useCallback(() => {
    if (!socket) return
    socket.emit('npcSetOnMap', { tokenId: t.id, onMap: false })
  }, [socket, t.id])

  const saveEdit = useCallback(() => {
    if (!socket) return
    socket.emit('tokenPatch', {
      tokenId: t.id,
      name: editName.trim() || t.name,
      img: editImg.trim(),
      frameColor: editFrameColor,
      hitPointsCurrent: Math.max(0, editHpCurrent),
      hitPointsMax: Math.max(0, editHpMax),
      hitPointsTemp: Math.max(0, editHpTemp),
    })
    setEditing(false)
  }, [
    socket,
    t.id,
    t.name,
    editName,
    editImg,
    editFrameColor,
    editHpCurrent,
    editHpMax,
    editHpTemp,
  ])

  const doDelete = useCallback(() => {
    if (!socket) return
    socket.emit('tokenDelete', { tokenId: t.id })
    setConfirmDelete(false)
  }, [socket, t.id])

  const sizeCategory = ddCategoryFromPixelSize(t.size, gridSize)
  const onSizeCategoryChange = useCallback(
    (cat: DdTokenSizeCategory) => {
      if (!socket) return
      const px = pixelSizeFromDdCategory(cat, gridSize)
      socket.emit('tokenSetSize', { tokenId: t.id, size: px })
    },
    [gridSize, socket, t.id],
  )

  return (
    <li className="flex flex-col gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)] px-3 py-2.5 transition hover:border-[var(--vtt-border)]">
      {/* Cabecera de la fila */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)]"
          style={{ borderColor: t.frameColor ?? DEFAULT_TOKEN_FRAME_COLOR }}
          aria-hidden
        >
          {t.img ? (
            <img src={t.img} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-vtt-display text-sm text-[var(--vtt-gold)]">
              {t.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-vtt-display text-sm font-medium text-[var(--vtt-text)]">
            {t.name}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-[var(--vtt-text-muted)]">{status}</p>
        </div>
        <span
          className={`shrink-0 rounded-sm px-2 py-0.5 font-vtt-display text-[0.6rem] font-semibold uppercase tracking-wider ${
            isPc
              ? 'border border-[var(--vtt-forest)]/40 bg-[var(--vtt-forest)]/15 text-[var(--vtt-forest)]'
              : 'border border-[var(--vtt-ember)]/35 bg-[var(--vtt-ember)]/12 text-[var(--vtt-ember)]'
          }`}
        >
          {isPc ? 'PJ' : 'PNJ'}
        </span>
        {/* Botones Editar / Eliminar */}
        {socket ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              title="Editar nombre e imagen"
              aria-label={`Editar ${t.name}`}
              aria-expanded={editing}
              aria-controls={`${rowId}-edit`}
              className={`rounded border px-1.5 py-0.5 text-[0.65rem] font-semibold transition ${
                editing
                  ? 'border-[var(--vtt-gold)] bg-[var(--vtt-surface-warm)] text-[var(--vtt-gold)]'
                  : 'border-[var(--vtt-border-subtle)] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)] hover:text-[var(--vtt-gold)]'
              }`}
              onClick={() => {
                setEditing((e) => !e)
                setConfirmDelete(false)
              }}
            >
              ✏️
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  title="Confirmar eliminación"
                  className="rounded border border-[var(--vtt-ember)]/60 bg-[var(--vtt-danger-bg)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--vtt-danger-text)] hover:bg-[var(--vtt-ember)]/20"
                  onClick={doDelete}
                >
                  ✓ Borrar
                </button>
                <button
                  type="button"
                  title="Cancelar"
                  className="rounded border border-[var(--vtt-border-subtle)] px-1.5 py-0.5 text-[0.65rem] text-[var(--vtt-text-muted)] hover:border-[var(--vtt-gold)]"
                  onClick={() => setConfirmDelete(false)}
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                title="Eliminar ficha"
                aria-label={`Eliminar ${t.name}`}
                className="rounded border border-[var(--vtt-border-subtle)] px-1.5 py-0.5 text-[0.65rem] text-[var(--vtt-text-muted)] transition hover:border-[var(--vtt-ember)]/60 hover:text-[var(--vtt-danger-text)]"
                onClick={() => {
                  setConfirmDelete(true)
                  setEditing(false)
                }}
              >
                🗑
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Panel de edición inline */}
      {editing ? (
        <div
          id={`${rowId}-edit`}
          className="flex flex-col gap-2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg)] p-2"
        >
          <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
            Nombre
            <input
              type="text"
              className="vtt-input mt-1 text-xs"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </label>
          <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
            URL de imagen
            <input
              type="url"
              className="vtt-input mt-1 text-xs"
              value={editImg}
              onChange={(e) => setEditImg(e.target.value)}
              placeholder="https://…"
              maxLength={2000}
            />
          </label>
          <div>
            <p className="text-[0.65rem] text-[var(--vtt-text-muted)]">Marco de cámara</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TOKEN_FRAME_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition ${editFrameColor === option.value ? 'scale-110 border-[var(--vtt-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : 'border-transparent opacity-85 hover:opacity-100'}`}
                  style={{ backgroundColor: option.value }}
                  title={option.label}
                  onClick={() => setEditFrameColor(option.value)}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
              HP act.
              <input
                type="number"
                min={0}
                className="vtt-input mt-1 text-xs"
                value={editHpCurrent}
                onChange={(e) => setEditHpCurrent(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
              HP máx.
              <input
                type="number"
                min={0}
                className="vtt-input mt-1 text-xs"
                value={editHpMax}
                onChange={(e) => setEditHpMax(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
              Temp.
              <input
                type="number"
                min={0}
                className="vtt-input mt-1 text-xs"
                value={editHpTemp}
                onChange={(e) => setEditHpTemp(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="vtt-btn-primary flex-1 text-xs" onClick={saveEdit}>
              Guardar cambios
            </button>
            <button
              type="button"
              className="vtt-btn-secondary text-xs"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {socket && isInReserve ? (
        <button type="button" className="vtt-btn-primary w-full text-xs" onClick={activateReserve}>
          Sacar al mapa (centro)
        </button>
      ) : null}
      {socket && showBenchAction ? (
        <button type="button" className="vtt-btn-secondary w-full text-xs" onClick={sendToBench}>
          Volver a reserva
        </button>
      ) : null}
      {socket ? (
        <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
          Tamaño en mapa (D&D, × casilla de {Math.round(gridSize)} px)
          <select
            className="vtt-input mt-1 text-xs"
            value={sizeCategory}
            onChange={(e) => onSizeCategoryChange(e.target.value as DdTokenSizeCategory)}
          >
            {ddSizeCategoriesOrdered().map((cat) => (
              <option key={cat} value={cat}>
                {DD_TOKEN_SIZE_LABELS[cat]} — ×{DD_TOKEN_SIZE_MULTIPLIERS[cat]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {socket ? (
        <label className="block text-[0.65rem] text-[var(--vtt-text-muted)]">
          Estados (coma, máx. 6)
          <input
            type="text"
            className="vtt-input mt-1 text-xs"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyConditions}
            maxLength={200}
            placeholder="ej. envenenado, derribado"
          />
        </label>
      ) : null}
    </li>
  )
}
