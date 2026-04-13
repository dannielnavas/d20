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
import { DmTokenRoster } from '../dm/DmTokenRoster'
import type { RoomState, Token } from '../../types/room'
import {
  loadYoutubeIframeApi,
  parseYoutubeUrl,
  youtubeEmbedSrc,
} from '../../utils/youtube'
import { TokensLayer } from './TokensLayer'

type YoutubeMapPlayer = {
  destroy: () => void
  unMute: () => void
  playVideo: () => void
  isMuted: () => boolean
}

type DirectMapVideoAudio = {
  muted: boolean
  unlock: () => void
}

function DirectMapLoopVideo({
  src,
  onLoadedMetadata,
  onError,
  onAudioState,
}: {
  src: string
  onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => void
  onError: () => void
  onAudioState: (s: DirectMapVideoAudio | null) => void
}) {
  const [muted, setMuted] = useState(true)
  const ref = useRef<HTMLVideoElement | null>(null)

  const unlock = useCallback(() => {
    setMuted(false)
    const v = ref.current
    if (v) {
      v.muted = false
      void v.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    onAudioState({ muted, unlock })
    return () => {
      onAudioState(null)
    }
  }, [muted, unlock, onAudioState])

  return (
    <video
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      src={src}
      loop
      muted={muted}
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
}

export function MapBoard({
  socket,
  roomState,
  setRoomState,
  canDragToken,
  isDm,
}: MapBoardProps) {
  const { backgroundUrl, backgroundType } = roomState.settings
  const [dims, setDims] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YoutubeMapPlayer | null>(null)
  const rawYtFrameId = useId()
  const ytIframeId = `vtt-yt${rawYtFrameId.replace(/\W/g, '')}`

  const [directMapAudio, setDirectMapAudio] = useState<DirectMapVideoAudio | null>(null)
  const [youtubeAudioCue, setYoutubeAudioCue] = useState(false)
  const [dmScreen, setDmScreen] = useState<DmScreenId>('mesa')

  const onDirectMapAudioState = useCallback((s: DirectMapVideoAudio | null) => {
    setDirectMapAudio(s)
  }, [])

  const handleTransformInit = useCallback((ctx: ReactZoomPanPinchRef) => {
    viewportRef.current = ctx.instance.wrapperComponent
  }, [])

  useEffect(() => {
    const url = backgroundUrl.trim()
    if (!url) {
      setDims({ w: DEFAULT_W, h: DEFAULT_H })
      return
    }
    if (backgroundType === 'video' && parseYoutubeUrl(url)) {
      setDims({ w: 1920, h: 1080 })
    }
  }, [backgroundUrl, backgroundType])

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
    hasMedia && backgroundType === 'video'
      ? parseYoutubeUrl(backgroundUrl)
      : null

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
      queueMicrotask(() => {
        setYoutubeAudioCue(false)
      })
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

        if (!YT?.Player) {
          setYoutubeAudioCue(true)
          return
        }

        try {
          const player = new YT.Player(ytIframeId, {
            events: {
              onReady: (e) => {
                if (cancelled) return
                ytPlayerRef.current = e.target
                try {
                  setYoutubeAudioCue(Boolean(e.target.isMuted?.()))
                } catch {
                  setYoutubeAudioCue(true)
                }
              },
            },
          })
          ytPlayerRef.current = player
        } catch {
          setYoutubeAudioCue(true)
        }
      })
      .catch(() => {
        setYoutubeAudioCue(true)
      })

    return () => {
      cancelled = true
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
    }
  }, [backgroundUrl, backgroundType, hasMedia, ytIframeId])

  const unlockYoutubeMapAudio = useCallback(() => {
    const p = ytPlayerRef.current
    if (!p) return
    try {
      p.unMute()
      p.playVideo()
    } catch {
      /* sin permiso o API no lista */
    }
    setYoutubeAudioCue(false)
  }, [])

  const showMapAudioButton =
    hasMedia &&
    backgroundType === 'video' &&
    ((youtubeParsed && youtubeAudioCue) || (!youtubeParsed && Boolean(directMapAudio?.muted)))

  const showInteractiveMap = !isDm || dmScreen === 'mesa'

  const getSpawnCenter = useCallback(
    () => ({
      x: Math.round(dims.w / 2),
      y: Math.round(dims.h / 2),
    }),
    [dims.h, dims.w],
  )

  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col gap-4"
      aria-label={isDm ? 'Tablero y herramientas de Dungeon Master' : 'Tablero de juego'}
    >
      {isDm ? <DmScreenNav value={dmScreen} onChange={setDmScreen} /> : null}

      {isDm && dmScreen === 'mapa' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row xl:items-stretch">
          <DmMapSetupForm
            socket={socket}
            settings={roomState.settings}
            sessionPasswordConfigured={Boolean(roomState.sessionPasswordConfigured)}
            className="w-full shrink-0 xl:max-w-md xl:min-w-[20rem]"
          />
          <DmMapPreview settings={roomState.settings} className="min-h-[min(40svh,320px)] xl:min-h-0" />
        </div>
      ) : null}

      {isDm && dmScreen === 'elenco' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
          <DmCastForm
            socket={socket}
            getSpawnCenter={getSpawnCenter}
            className="w-full shrink-0 lg:max-w-md lg:min-w-[20rem]"
          />
          <DmTokenRoster tokens={roomState.tokens} className="min-h-[min(36svh,280px)] flex-1 lg:min-h-0" />
        </div>
      ) : null}

      {showInteractiveMap ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <p className="mb-2 max-w-prose text-xs leading-relaxed text-[var(--vtt-text-muted)]">
            {isDm
              ? 'Vista Mesa: rueda o pellizco para zoom; arrastra el fondo en zonas vacías. Configura mapa y fichas en las pestañas superiores.'
              : 'Rueda o pellizco: zoom en el mapa. Arrastra tu token; el fondo se mueve desde zonas vacías.'}
          </p>
          <div
            className="relative min-h-[min(70svh,720px)] w-full flex-1 overflow-hidden rounded-[var(--vtt-radius)] border border-[var(--vtt-border)] bg-[#040302] shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]"
            style={{ backgroundColor: 'var(--dm-map-chrome, #040302)' }}
            role="application"
            aria-roledescription="lienzo del tablero"
            aria-label="Vista del mapa: zoom con la rueda o gestos, arrastre para desplazar"
          >
            <TransformWrapper
              onInit={handleTransformInit}
              initialScale={1}
              minScale={0.08}
              maxScale={14}
              limitToBounds={false}
              centerOnInit
              wheel={{ step: 0.12, excluded: ['vtt-token'] }}
              pinch={{ step: 6, excluded: ['vtt-token'] }}
              doubleClick={{ mode: 'reset', step: 0.7, excluded: ['vtt-token'] }}
              panning={{ velocityDisabled: false, excluded: ['vtt-token'] }}
            >
              <TransformComponent
                wrapperClass="!h-full !w-full"
                contentClass="!inline-block"
              >
                <div
                  className="relative shrink-0 select-none"
                  style={{ width: dims.w, height: dims.h }}
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
                          ? 'En «Mapa» puedes cargar imagen, vídeo o YouTube; aquí verás el tablero en vivo.'
                          : 'El DM puede cargar el mapa y crear personajes para la mesa cuando esté listo.'}
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
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
            {showMapAudioButton ? (
              <div className="pointer-events-auto absolute bottom-3 right-3 z-[2000]">
                <button
                  type="button"
                  aria-label="Activar audio del vídeo de mapa"
                  className="font-vtt-display rounded-md border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--vtt-gold)] shadow-[0_4px_20px_rgba(0,0,0,0.45)] transition hover:border-[var(--vtt-gold-dim)] hover:text-[var(--vtt-gold)]"
                  onClick={youtubeParsed ? unlockYoutubeMapAudio : () => directMapAudio?.unlock()}
                >
                  Activar audio del mapa
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
