import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'
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

  useEffect(() => {
    setDraft((t.conditions ?? []).join(', '))
  }, [t.conditions, t.id])

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
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)]"
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
      </div>
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
