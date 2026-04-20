import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type SyntheticEvent,
} from 'react'
import type { Socket } from 'socket.io-client'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { DmCastForm } from '../dm/DmCastForm'
import { DmMapPreview } from '../dm/DmMapPreview'
import { DmMapSetupForm } from '../dm/DmMapSetupForm'
import type { DmScreenId } from '../dm/DmScreenNav'
import { DmScreenNav } from '../dm/DmScreenNav'
import { DmSceneBar } from '../dm/DmSceneBar'
import { DmTokenRoster } from '../dm/DmTokenRoster'
import type { RoomState, Token } from '../../types/room'
import { loadYoutubeIframeApi, parseYoutubeUrl, youtubeEmbedSrc } from '../../utils/youtube'
import { MapPingBridge } from './MapPingLayer'
import { ScreenReactionPalette } from '../reactions/ScreenReactionPalette'
import { TokensLayer } from './TokensLayer'
import { DmQuickNpcPanel } from '../dm/DmQuickNpcPanel'

type YoutubeMapPlayer = {
  destroy: () => void
  unMute: () => void
  mute?: () => void
  playVideo: () => void
  isMuted: () => boolean
  setVolume?: (value: number) => void
}

function DirectMapLoopVideo({
  src,
  audioEnabled,
  volumePercent,
  onLoadedMetadata,
  onError,
  onAudioState,
}: {
  src: string
  audioEnabled: boolean
  volumePercent: number
  onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => void
  onError: () => void
  onAudioState: (el: HTMLVideoElement | null) => void
}) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.volume = Math.max(0, Math.min(1, volumePercent / 100))
  }, [volumePercent])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = !audioEnabled
    if (audioEnabled) void v.play().catch(() => {})
  }, [audioEnabled])

  useEffect(() => {
    onAudioState(ref.current)
    return () => {
      onAudioState(null)
    }
  }, [onAudioState])

  return (
    <video
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      src={src}
      loop
      muted={!audioEnabled}
      playsInline
      autoPlay
      preload="metadata"
      onLoadedMetadata={onLoadedMetadata}
      onError={onError}
    />
  )
}

const DEFAULT_W = 1600
const DEFAULT_H = 900

export type MapBoardProps = {
  socket: Socket
  roomState: RoomState
  setRoomState: Dispatch<SetStateAction<RoomState | null>>
  canDragToken: (token: Token) => boolean
  isDm: boolean
  /** Solo lectura: sin ping ni arrastre. */
  isSpectator?: boolean
  /**
   * Si el DM usa la columna de herramientas, no duplicar el recuadro de audio/volumen del vídeo en el mapa.
   */
  suppressDmMapVideoChrome?: boolean
  /** Jugador en mapa: paleta de reacciones a pantalla completa. */
  showReactionPalette?: boolean
}

export function MapBoard({
  socket,
  roomState,
  setRoomState,
  canDragToken,
  isDm,
  isSpectator = false,
  suppressDmMapVideoChrome = false,
  showReactionPalette = false,
}: MapBoardProps) {
  const { backgroundUrl, backgroundType, mapAudioEnabled } = roomState.settings
  const mapVolume = Math.min(100, Math.max(0, Math.round(roomState.settings.mapVolume ?? 70)))
  const [dims, setDims] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YoutubeMapPlayer | null>(null)
  const rawYtFrameId = useId()
  const ytIframeId = `vtt-yt${rawYtFrameId.replace(/\W/g, '')}`
  const mapBoardA11yId = useId()

  const directMapVideoRef = useRef<HTMLVideoElement | null>(null)
  const [dmScreen, setDmScreen] = useState<DmScreenId>('mesa')

  const onDirectMapAudioState = useCallback((el: HTMLVideoElement | null) => {
    directMapVideoRef.current = el
  }, [])

  const handleTransformInit = useCallback((ctx: ReactZoomPanPinchRef) => {
    viewportRef.current = ctx.instance.wrapperComponent
  }, [])

  const onImgLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    const w = el.naturalWidth || DEFAULT_W
    const h = el.naturalHeight || DEFAULT_H
    setDims({ w, h })
  }, [])

  const onImgError = useCallback(() => {
    setDims({ w: DEFAULT_W, h: DEFAULT_H })
  }, [])

  const onVideoMeta = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    const w = v.videoWidth || DEFAULT_W
    const h = v.videoHeight || DEFAULT_H
    setDims({ w, h })
  }, [])

  const onVideoError = useCallback(() => {
    setDims({ w: DEFAULT_W, h: DEFAULT_H })
  }, [])

  const hasMedia = Boolean(backgroundUrl.trim())
  const youtubeParsed =
    hasMedia && backgroundType === 'video' ? parseYoutubeUrl(backgroundUrl) : null
  const boardDims = !hasMedia
    ? { w: DEFAULT_W, h: DEFAULT_H }
    : backgroundType === 'video' && youtubeParsed
      ? { w: 1920, h: 1080 }
      : dims

  const ytEmbedSrc = useMemo(() => {
    if (!hasMedia || backgroundType !== 'video') return ''
    const parsed = parseYoutubeUrl(backgroundUrl.trim())
    if (!parsed) return ''
    return youtubeEmbedSrc(parsed, {
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    })
  }, [hasMedia, backgroundType, backgroundUrl])

  useEffect(() => {
    const parsed =
      hasMedia && backgroundType === 'video' ? parseYoutubeUrl(backgroundUrl.trim()) : null
    if (!parsed) {
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
      return
    }

    let cancelled = false

    void loadYoutubeIframeApi()
      .then(() => {
        if (cancelled) return
        ytPlayerRef.current?.destroy()
        ytPlayerRef.current = null

        const YT = (
          window as unknown as {
            YT: {
              Player: new (
                id: string,
                opts: {
                  events?: {
                    onReady?: (e: { target: YoutubeMapPlayer }) => void
                  }
                },
              ) => YoutubeMapPlayer
            }
          }
        ).YT

        if (!YT?.Player) return

        try {
          const player = new YT.Player(ytIframeId, {
            events: {
              onReady: (e) => {
                if (cancelled) return
                ytPlayerRef.current = e.target
                try {
                  e.target.setVolume?.(mapVolume)
                } catch {
                  /* opcional en typings */
                }
                if (mapAudioEnabled) {
                  try {
                    e.target.unMute()
                    e.target.playVideo()
                  } catch {
                    /* puede requerir interacción del navegador */
                  }
                } else {
                  try {
                    e.target.mute?.()
                  } catch {
                    /* opcional en typings */
                  }
                }
              },
            },
          })
          ytPlayerRef.current = player
        } catch {
          /* creación del player puede fallar en iframes bloqueados */
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
    }
  }, [backgroundUrl, backgroundType, hasMedia, ytIframeId])

  useEffect(() => {
    if (!hasMedia || backgroundType !== 'video') return
    if (youtubeParsed) {
      try {
        ytPlayerRef.current?.setVolume?.(mapVolume)
      } catch {
        /* opcional en typings */
      }
      if (mapAudioEnabled) {
        try {
          ytPlayerRef.current?.unMute()
          ytPlayerRef.current?.playVideo()
        } catch {
          /* puede requerir interacción del navegador */
        }
      } else {
        try {
          ytPlayerRef.current?.mute?.()
        } catch {
          /* opcional en typings */
        }
      }
      return
    }
    const v = directMapVideoRef.current
    if (v) {
      v.volume = Math.max(0, Math.min(1, mapVolume / 100))
      v.muted = !mapAudioEnabled
      if (mapAudioEnabled) void v.play().catch(() => {})
    }
  }, [backgroundType, hasMedia, mapAudioEnabled, mapVolume, youtubeParsed])

  const updateRoomSettingAsDm = useCallback(
    (partial: Partial<RoomState['settings']>) => {
      if (!isDm) return
      socket.emit('updateRoomSettings', partial)
    },
    [isDm, socket],
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

  const showMapAudioButton = isDm && hasMedia && backgroundType === 'video'
  const showVolumeControl = isDm && hasMedia && backgroundType === 'video'

  const showInteractiveMap = !isDm || dmScreen === 'mesa'

  const canEmitPing = !isSpectator && (isDm || roomState.settings.playersCanPing !== false)

  const getSpawnCenter = useCallback(
    () => ({
      x: Math.round(boardDims.w / 2),
      y: Math.round(boardDims.h / 2),
    }),
    [boardDims.h, boardDims.w],
  )

  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col gap-4"
      aria-label={isDm ? 'Tablero del director de juego' : 'Tablero de juego'}
    >
      {isDm ? <DmScreenNav value={dmScreen} onChange={setDmScreen} /> : null}

      {isDm ? (
        <DmSceneBar socket={socket} roomState={roomState} className="w-full max-w-4xl shrink-0" />
      ) : null}

      {isDm && dmScreen === 'mapa' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row xl:items-stretch">
          <DmMapSetupForm
            socket={socket}
            settings={roomState.settings}
            sessionPasswordConfigured={Boolean(roomState.sessionPasswordConfigured)}
            className="w-full shrink-0 xl:max-w-md xl:min-w-[20rem]"
          />
          <DmMapPreview
            settings={roomState.settings}
            className="min-h-[min(40svh,320px)] xl:min-h-0"
          />
        </div>
      ) : null}

      {isDm && dmScreen === 'elenco' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
          <DmCastForm
            socket={socket}
            getSpawnCenter={getSpawnCenter}
            className="w-full shrink-0 lg:max-w-md lg:min-w-[20rem]"
          />
          <DmTokenRoster
            socket={socket}
            gridSize={roomState.settings.gridSize}
            tokens={roomState.tokens}
            getSpawnCenter={getSpawnCenter}
            className="min-h-[min(36svh,280px)] flex-1 lg:min-h-0"
          />
        </div>
      ) : null}

      {showInteractiveMap ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <p className="mb-2 max-w-prose text-xs leading-relaxed text-[var(--vtt-text-muted)]">
            {isDm
              ? 'Vista Mesa: rueda o pellizco para acercar o alejar; arrastra el fondo por las zonas vacías. Mayús+clic en el mapa para ping. Reacciones a pantalla: columna derecha.'
              : 'Rueda o pellizco para zoom en el mapa. Arrastra tu ficha con el dedo o el ratón; Mayús+clic en el mapa para ping. Reacciones en el panel de herramientas a la izquierda. El fondo se mueve desde las zonas vacías.'}
          </p>
          <div
            className="relative min-h-[min(70svh,720px)] w-full flex-1 overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[#040302] shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]"
            style={{ backgroundColor: 'var(--dm-map-chrome, #040302)' }}
            role="application"
            aria-roledescription="lienzo del tablero"
            aria-describedby={mapBoardA11yId}
            aria-label="Mapa: zoom con la rueda o con dos dedos; arrastre con un dedo o el ratón para desplazar el lienzo; Tab para enfocar fichas."
          >
            <p id={mapBoardA11yId} className="sr-only">
              Tab para enfocar fichas que puedas mover. Las flechas mueven la ficha enfocada. Mayús
              aumenta el paso. Arrastra con el dedo o el puntero para mover una ficha. Dos dedos en el
              mapa vacío para acercar o alejar. Mayús y clic en el mapa para señalar un punto (ping).
            </p>
            <TransformWrapper
              onInit={handleTransformInit}
              initialScale={1}
              minScale={0.25}
              maxScale={14}
              limitToBounds={true}
              centerOnInit
              wheel={{ step: 0.12, excluded: ['vtt-token'] }}
              pinch={{ step: 6, excluded: ['vtt-token'] }}
              doubleClick={{ mode: 'reset', step: 0.7, excluded: ['vtt-token'] }}
              panning={{ velocityDisabled: false, excluded: ['vtt-token'] }}
            >
              <TransformComponent
                wrapperClass="!h-full !w-full touch-none"
                contentClass="!inline-block"
              >
                <MapPingBridge
                  socket={socket}
                  viewportRef={viewportRef}
                  canEmitPing={canEmitPing}
                  style={{ width: boardDims.w, height: boardDims.h }}
                >
                  <div
                    key={roomState.activeSceneId}
                    className="vtt-scene-enter relative h-full w-full"
                  >
                    {hasMedia && backgroundType === 'video' && youtubeParsed && ytEmbedSrc ? (
                      <iframe
                        key={backgroundUrl}
                        id={ytIframeId}
                        title="Vídeo de mapa (YouTube)"
                        className="pointer-events-none absolute inset-0 h-full w-full border-0 object-contain"
                        src={ytEmbedSrc}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : null}
                    {hasMedia && backgroundType === 'video' && !youtubeParsed ? (
                      <DirectMapLoopVideo
                        key={backgroundUrl}
                        src={backgroundUrl}
                        audioEnabled={mapAudioEnabled}
                        volumePercent={mapVolume}
                        onLoadedMetadata={onVideoMeta}
                        onError={onVideoError}
                        onAudioState={onDirectMapAudioState}
                      />
                    ) : null}
                    {hasMedia && backgroundType === 'image' ? (
                      <img
                        key={backgroundUrl}
                        alt=""
                        role="presentation"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                        src={backgroundUrl}
                        onLoad={onImgLoad}
                        onError={onImgError}
                      />
                    ) : null}
                    {!hasMedia ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--vtt-bg-elevated)] text-center">
                        <p className="font-vtt-display text-sm font-semibold tracking-wide text-[var(--vtt-gold)]">
                          Sin mapa cargado
                        </p>
                        <p className="max-w-sm px-4 text-xs leading-relaxed text-[var(--vtt-text-muted)]">
                          {isDm
                            ? 'En la pestaña «Mapa» puedes poner imagen, vídeo o YouTube; aquí verás el tablero en vivo.'
                            : 'Cuando el director cargue el mapa y coloque personajes, verás la mesa aquí.'}
                        </p>
                        <div
                          className="absolute inset-0 opacity-[0.14]"
                          aria-hidden
                          style={{
                            backgroundImage: `
                          linear-gradient(to right, rgba(201, 164, 58, 0.35) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(201, 164, 58, 0.35) 1px, transparent 1px)
                        `,
                            backgroundSize: '64px 64px',
                          }}
                        />
                      </div>
                    ) : null}

                    <TokensLayer
                      socket={socket}
                      tokens={roomState.tokens}
                      setRoomState={setRoomState}
                      viewportRef={viewportRef}
                      canDragToken={canDragToken}
                      gridSize={roomState.settings.gridSize}
                      snapToGrid={roomState.settings.snapToGrid}
                      showTokenNames={roomState.settings.showTokenNames !== false}
                      raisedHands={roomState.raisedHands ?? []}
                      showRaiseHandForDm={isDm}
                    />
                  </div>
                </MapPingBridge>
              </TransformComponent>
            </TransformWrapper>
            {showReactionPalette ? (
              <div className="pointer-events-auto absolute bottom-12 left-3 z-[1998] max-w-[calc(100%-1.5rem)] rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)]/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
                <ScreenReactionPalette socket={socket} />
              </div>
            ) : null}

            {isDm ? (
              <DmQuickNpcPanel
                tokens={roomState.tokens}
                socket={socket}
                getSpawnCenter={getSpawnCenter}
              />
            ) : null}

            {(showMapAudioButton || showVolumeControl) && !(isDm && suppressDmMapVideoChrome) ? (
              <div className="pointer-events-auto absolute bottom-3 right-3 z-[2000] flex min-w-[15rem] flex-col gap-2 rounded-md border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] p-2 shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
                {showMapAudioButton ? (
                  <button
                    type="button"
                    aria-label={
                      mapAudioEnabled
                        ? 'Desactivar audio del vídeo de mapa'
                        : 'Activar audio del vídeo de mapa'
                    }
                    className="font-vtt-display rounded-md border border-[var(--vtt-border)] bg-[var(--vtt-surface-warm)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] transition hover:border-[var(--vtt-gold-dim)] hover:text-[var(--vtt-gold)]"
                    onClick={toggleRoomMapAudio}
                  >
                    {mapAudioEnabled ? 'Desactivar audio del mapa' : 'Activar audio del mapa'}
                  </button>
                ) : null}
                {showVolumeControl ? (
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
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
