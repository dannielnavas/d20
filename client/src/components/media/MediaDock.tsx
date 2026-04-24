import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { RoomState } from '../../types/room'
import type { SessionState } from '../../types/session'
import {
  IconCamOff,
  IconCamOn,
  IconHangUp,
  IconJoinCall,
  IconMicOff,
  IconMicOn,
} from './media-icons'
export type MediaDockLayout = 'lobby' | 'map'

type MediaDockProps = {
  socket: Socket
  session: SessionState
  roomState: RoomState
  layout: MediaDockLayout
  playerSessionId?: string | null
}

type RemoteTile = {
  stream: MediaStream
  label: string
  avatarUrl: string | null
  frameColor: string | null
}

type ParticipantTile = {
  id: string
  label: string
  isNarrator: boolean
  stream: MediaStream
  muted: boolean
  avatarUrl: string | null
  frameColor: string | null
}

function iceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_STUN_URLS as string | undefined
  if (raw?.trim()) {
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
      .map((urls) => ({ urls }))
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }]
}

function localDisplayName(session: SessionState, roomState: RoomState): string {
  if (session.role === 'dm') return 'Narrador'
  if (session.role === 'spectator') return 'Espectador'
  const id = session.claimedTokenId
  if (!id) return 'Jugador'
  const token = roomState.scenes.flatMap((scene) => scene.tokens).find((item) => item.id === id)
  return token?.name ?? 'Jugador'
}

function localAvatarUrl(session: SessionState, roomState: RoomState): string | null {
  if (session.role === 'dm' || session.role === 'spectator') return null
  const id = session.claimedTokenId
  if (!id) return null
  const token = roomState.scenes.flatMap((scene) => scene.tokens).find((item) => item.id === id)
  return token?.img ?? null
}

function localFrameColor(session: SessionState, roomState: RoomState): string | null {
  if (session.role === 'dm') return '#d4b061'
  if (session.role === 'spectator') return '#6a5a42'
  const id = session.claimedTokenId
  if (!id) return '#b48a3c'
  const token = roomState.scenes.flatMap((scene) => scene.tokens).find((item) => item.id === id)
  return token?.frameColor ?? '#b48a3c'
}

function isNarratorLabel(label: string): boolean {
  return label.trim().toLowerCase() === 'narrador'
}

function hasUsableVideo(stream: MediaStream | null): boolean {
  if (!stream) return false
  return stream.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted)
}

function useSpeakingLevels(participants: ParticipantTile[]): Record<string, number> {
  const [levels, setLevels] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const context = new AudioCtx()
    const analysers = new Map<
      string,
      { analyser: AnalyserNode; data: Uint8Array; source: MediaStreamAudioSourceNode }
    >()
    let frameId = 0
    let cancelled = false

    for (const participant of participants) {
      if (participant.muted) continue
      if (participant.stream.getAudioTracks().length === 0) continue
      try {
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.82
        const source = context.createMediaStreamSource(participant.stream)
        source.connect(analyser)
        analysers.set(participant.id, {
          analyser,
          data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
          source,
        })
      } catch {
        /* algunos navegadores o streams remotos pueden rechazar el análisis */
      }
    }

    const tick = () => {
      if (cancelled) return
      const next: Record<string, number> = {}
      analysers.forEach((entry, id) => {
        entry.analyser.getByteFrequencyData(entry.data as Uint8Array<ArrayBuffer>)
        let sum = 0
        for (let index = 0; index < entry.data.length; index += 1) sum += entry.data[index] ?? 0
        next[id] = sum / (entry.data.length * 255)
      })
      setLevels(next)
      frameId = window.requestAnimationFrame(tick)
    }

    void context.resume().catch(() => {})
    frameId = window.requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (frameId) window.cancelAnimationFrame(frameId)
      analysers.forEach((entry) => {
        try {
          entry.source.disconnect()
        } catch {
          /* noop */
        }
      })
      void context.close().catch(() => {})
    }
  }, [participants])

  return levels
}

type IconBtnProps = {
  label: string
  title: string
  onClick: () => void
  pressed?: boolean
  off?: boolean
  variant?: 'default' | 'primary' | 'danger'
  children: React.ReactNode
}

function MediaIconBtn({
  label,
  title,
  onClick,
  pressed,
  off,
  variant = 'default',
  children,
}: IconBtnProps) {
  const cls =
    variant === 'primary'
      ? 'vtt-media-icon-btn vtt-media-icon-btn--primary'
      : variant === 'danger'
        ? 'vtt-media-icon-btn vtt-media-icon-btn--danger'
        : 'vtt-media-icon-btn'
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      title={title}
      aria-pressed={pressed}
      data-off={off ? 'true' : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function VideoThumb({
  stream,
  name,
  avatarUrl,
  frameColor,
  isSpeaking = false,
  isLeadSpeaker = false,
  muted,
  compact,
  featured,
  compactVariant = 'default',
  handRaised,
  isNarrator = false,
}: {
  stream: MediaStream
  name: string
  avatarUrl?: string | null
  frameColor?: string | null
  isSpeaking?: boolean
  isLeadSpeaker?: boolean
  muted?: boolean
  compact: boolean
  featured?: boolean
  /** En mapa: `narrator` = tile arriba (compacto); `default` / `featured` = carril / PIP. */
  compactVariant?: 'default' | 'featured' | 'narrator'
  handRaised?: boolean
  isNarrator?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const showPortrait = !hasUsableVideo(stream)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.srcObject = stream
    void element.play().catch(() => {})
    return () => {
      element.srcObject = null
    }
  }, [stream])

  const accent = frameColor ?? (isNarrator ? '#d4b061' : '#b48a3c')
  const shellClass = compact
    ? compactVariant === 'narrator'
      ? 'relative h-[10.7rem] w-[19rem] shrink-0 overflow-visible'
      : featured
        ? 'relative h-[10.7rem] w-[19rem] shrink-0 overflow-visible bg-transparent'
        : 'relative h-[10.7rem] w-[19rem] shrink-0 overflow-visible bg-transparent'
    : 'relative h-[10.7rem] w-[19rem] shrink-0 overflow-visible bg-transparent'
  const nameInitials = name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const scrollName = (isNarrator ? 'Narrador' : name).replace(/^Tú\s·\s*/u, '')

  return (
    <div
      className={`${shellClass} vtt-media-thumb vtt-media-thumb--ornate ${isSpeaking ? 'vtt-media-thumb--speaking' : ''} ${isLeadSpeaker ? 'vtt-media-thumb--lead' : ''}`}
      style={{ '--vtt-thumb-accent': accent } as React.CSSProperties}
    >
      <div className="vtt-media-thumb__frame-art" aria-hidden />
      <div className="vtt-media-thumb__camera-window absolute overflow-hidden mt-[-13px] ml-[1px]">
        <video
          ref={ref}
          className={`h-full w-full object-cover transition-opacity duration-300 ${showPortrait ? 'opacity-0' : 'opacity-100'}`}
          playsInline
          muted={muted}
          autoPlay
          aria-label={name}
        />
        {showPortrait ? (
          <div className="vtt-media-thumb__portrait absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.07),transparent_28%),linear-gradient(180deg,rgba(20,16,12,0.9),rgba(8,7,6,0.98))]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="vtt-media-thumb__portrait-img h-full w-full object-cover" />
            ) : (
              <span
                className="font-vtt-display text-xl uppercase tracking-[0.16em]"
                style={{ color: accent }}
              >
                {nameInitials}
              </span>
            )}
          </div>
        ) : null}
      </div>
      <div className="vtt-media-thumb__scroll-name pointer-events-none absolute left-1/2 top-[6.4%] z-[4] flex h-[8.3%] w-[35%] -translate-x-1/2 items-center justify-center px-2">
        <p className="w-full truncate text-center font-vtt-display text-[0.47rem] font-semibold uppercase tracking-[0.12em] text-[#332116]">
          {scrollName}
        </p>
      </div>
      {isSpeaking ? <span className="vtt-media-thumb__voice-waves" aria-hidden /> : null}
      {handRaised ? (
        <span
          className="pointer-events-none absolute right-1 top-1 z-[3] text-[1.05rem] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          title="Mano levantada"
          aria-hidden
        >
          ✋
        </span>
      ) : null}
      {isNarrator ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1 z-[3] -translate-x-1/2 rounded-full px-2 py-0.5 font-vtt-display text-[0.45rem] font-semibold uppercase tracking-[0.24em] text-[var(--vtt-bg)]"
          style={{ backgroundColor: accent }}
        >
          Narrador
        </div>
      ) : null}
    </div>
  )
}

export function MediaDock({
  socket,
  session,
  roomState,
  layout,
  playerSessionId = null,
}: MediaDockProps) {
  const mapDockPanelId = 'vtt-media-map-panel'
  const label = useMemo(() => localDisplayName(session, roomState), [session, roomState])
  const avatarUrl = useMemo(() => localAvatarUrl(session, roomState), [session, roomState])
  const frameColor = useMemo(() => localFrameColor(session, roomState), [session, roomState])
  const labelRef = useRef(label)
  labelRef.current = label
  const avatarRef = useRef<string | null>(avatarUrl)
  avatarRef.current = avatarUrl
  const frameColorRef = useRef<string | null>(frameColor)
  frameColorRef.current = frameColor

  const [inCall, setInCall] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [mapDockExpanded, setMapDockExpanded] = useState(false)
  const [remotes, setRemotes] = useState<Record<string, RemoteTile>>({})
  const [mediaErr, setMediaErr] = useState<string | null>(null)

  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const iceBufRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const labelsRef = useRef(new Map<string, string>())
  const avatarsRef = useRef(new Map<string, string | null>())
  const frameColorsRef = useRef(new Map<string, string | null>())
  const localStreamRef = useRef<MediaStream | null>(null)
  localStreamRef.current = localStream

  const updateRemote = useCallback((peerId: string, stream: MediaStream) => {
    setRemotes((prev) => ({
      ...prev,
      [peerId]: {
        stream,
        label: labelsRef.current.get(peerId) ?? 'Participante',
        avatarUrl: avatarsRef.current.get(peerId) ?? null,
        frameColor: frameColorsRef.current.get(peerId) ?? null,
      },
    }))
  }, [])

  const removeRemote = useCallback((peerId: string) => {
    setRemotes((prev) => {
      if (!(peerId in prev)) return prev
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

  const flushIce = useCallback((peerId: string, pc: RTCPeerConnection) => {
    const pending = iceBufRef.current.get(peerId)
    if (!pending?.length) return
    iceBufRef.current.delete(peerId)
    for (const candidate of pending) {
      void pc.addIceCandidate(candidate).catch(() => {})
    }
  }, [])

  const closeAllPeers = useCallback(() => {
    for (const pc of pcsRef.current.values()) pc.close()
    pcsRef.current.clear()
    iceBufRef.current.clear()
    labelsRef.current.clear()
    avatarsRef.current.clear()
    frameColorsRef.current.clear()
    setRemotes({})
  }, [])

  const getOrCreatePc = useCallback(
    (remoteId: string) => {
      let pc = pcsRef.current.get(remoteId)
      if (pc) return pc
      pc = new RTCPeerConnection({ iceServers: iceServers() })
      pcsRef.current.set(remoteId, pc)

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socket.connected) return
        socket.emit('webrtcSignal', {
          targetId: remoteId,
          payload: { type: 'ice', candidate: event.candidate.toJSON() },
        })
      }

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track])
        updateRemote(remoteId, stream)
      }

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === 'failed') {
          pc.close()
          pcsRef.current.delete(remoteId)
          removeRemote(remoteId)
        }
      }

      return pc
    },
    [removeRemote, socket, updateRemote],
  )

  useEffect(() => {
    if (!inCall || !localStream) return

    const onSnapshot = async (msg: {
      peers: {
        peerId: string
        displayName: string
        avatarUrl?: string | null
        frameColor?: string | null
      }[]
    }) => {
      const stream = localStreamRef.current
      if (!stream) return
      for (const peer of msg.peers) {
        labelsRef.current.set(peer.peerId, peer.displayName)
        avatarsRef.current.set(
          peer.peerId,
          typeof peer.avatarUrl === 'string' && peer.avatarUrl.length > 0 ? peer.avatarUrl : null,
        )
        frameColorsRef.current.set(
          peer.peerId,
          typeof peer.frameColor === 'string' && peer.frameColor.length > 0
            ? peer.frameColor
            : null,
        )
        try {
          const pc = getOrCreatePc(peer.peerId)
          const senders = pc.getSenders()
          for (const track of stream.getTracks()) {
            if (!senders.some((sender) => sender.track === track)) {
              pc.addTrack(track, stream)
            }
          }
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socket.emit('webrtcSignal', {
            targetId: peer.peerId,
            payload: { type: 'offer', sdp: offer.sdp! },
          })
        } catch {
          setMediaErr(
            'No pudimos enlazar voz o vídeo con alguien en la mesa. Sal de la llamada y vuelve a unirte.',
          )
        }
      }
    }

    const onPeerJoined = (msg: {
      peerId: string
      displayName: string
      avatarUrl?: string | null
      frameColor?: string | null
    }) => {
      labelsRef.current.set(msg.peerId, msg.displayName)
      avatarsRef.current.set(
        msg.peerId,
        typeof msg.avatarUrl === 'string' && msg.avatarUrl.length > 0 ? msg.avatarUrl : null,
      )
      frameColorsRef.current.set(
        msg.peerId,
        typeof msg.frameColor === 'string' && msg.frameColor.length > 0 ? msg.frameColor : null,
      )
    }

    const onPeerUpdated = (msg: {
      peerId: string
      displayName: string
      avatarUrl?: string | null
      frameColor?: string | null
    }) => {
      labelsRef.current.set(msg.peerId, msg.displayName)
      avatarsRef.current.set(
        msg.peerId,
        typeof msg.avatarUrl === 'string' && msg.avatarUrl.length > 0 ? msg.avatarUrl : null,
      )
      frameColorsRef.current.set(
        msg.peerId,
        typeof msg.frameColor === 'string' && msg.frameColor.length > 0 ? msg.frameColor : null,
      )
      setRemotes((prev) => {
        if (!prev[msg.peerId]) return prev
        return {
          ...prev,
          [msg.peerId]: {
            ...prev[msg.peerId],
            label: msg.displayName,
            avatarUrl:
              typeof msg.avatarUrl === 'string' && msg.avatarUrl.length > 0 ? msg.avatarUrl : null,
            frameColor:
              typeof msg.frameColor === 'string' && msg.frameColor.length > 0
                ? msg.frameColor
                : null,
          },
        }
      })
    }

    const onPeerLeft = (msg: { peerId: string }) => {
      const pc = pcsRef.current.get(msg.peerId)
      if (pc) {
        pc.close()
        pcsRef.current.delete(msg.peerId)
      }
      iceBufRef.current.delete(msg.peerId)
      labelsRef.current.delete(msg.peerId)
      avatarsRef.current.delete(msg.peerId)
      frameColorsRef.current.delete(msg.peerId)
      removeRemote(msg.peerId)
    }

    const onSignal = async (msg: { fromId: string; payload: unknown }) => {
      const stream = localStreamRef.current
      if (!stream) return
      const fromId = msg.fromId
      const raw = msg.payload as Record<string, unknown>
      const type = raw.type

      if (type === 'ice' && raw.candidate && typeof raw.candidate === 'object') {
        const candidate = raw.candidate as RTCIceCandidateInit
        const pc = pcsRef.current.get(fromId)
        if (pc?.remoteDescription) {
          void pc.addIceCandidate(candidate).catch(() => {})
        } else {
          const list = iceBufRef.current.get(fromId) ?? []
          list.push(candidate)
          iceBufRef.current.set(fromId, list)
        }
        return
      }

      if (type === 'offer' && typeof raw.sdp === 'string') {
        try {
          const pc = getOrCreatePc(fromId)
          if (pc.remoteDescription) return
          await pc.setRemoteDescription({ type: 'offer', sdp: raw.sdp })
          flushIce(fromId, pc)
          for (const track of stream.getTracks()) {
            if (!pc.getSenders().some((sender) => sender.track === track)) {
              pc.addTrack(track, stream)
            }
          }
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          flushIce(fromId, pc)
          socket.emit('webrtcSignal', {
            targetId: fromId,
            payload: { type: 'answer', sdp: answer.sdp! },
          })
        } catch {
          setMediaErr('No pudimos aceptar la llamada entrante. Revisa la red e inténtalo otra vez.')
        }
        return
      }

      if (type === 'answer' && typeof raw.sdp === 'string') {
        const pc = pcsRef.current.get(fromId)
        if (!pc || pc.signalingState !== 'have-local-offer') return
        try {
          await pc.setRemoteDescription({ type: 'answer', sdp: raw.sdp })
          flushIce(fromId, pc)
        } catch {
          setMediaErr('La conexión no llegó a completarse. Espera unos segundos y prueba de nuevo.')
        }
      }
    }

    const onMediaErr = (msg: { message?: string }) => {
      setMediaErr(
        msg?.message ?? 'Algo falló con la llamada de mesa. Comprueba permisos y conexión.',
      )
    }

    const onDisconnect = () => {
      setMediaErr('Se cortó la conexión; la llamada se cerró.')
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
      setInCall(false)
    }

    socket.on('mediaPeersSnapshot', onSnapshot)
    socket.on('mediaPeerJoined', onPeerJoined)
    socket.on('mediaPeerUpdated', onPeerUpdated)
    socket.on('mediaPeerLeft', onPeerLeft)
    socket.on('webrtcSignal', onSignal)
    socket.on('mediaError', onMediaErr)
    socket.on('disconnect', onDisconnect)

    socket.emit('mediaJoin', {
      displayName: labelRef.current,
      avatarUrl: avatarRef.current,
      frameColor: frameColorRef.current,
    })

    return () => {
      socket.off('mediaPeersSnapshot', onSnapshot)
      socket.off('mediaPeerJoined', onPeerJoined)
      socket.off('mediaPeerUpdated', onPeerUpdated)
      socket.off('mediaPeerLeft', onPeerLeft)
      socket.off('webrtcSignal', onSignal)
      socket.off('mediaError', onMediaErr)
      socket.off('disconnect', onDisconnect)
      if (socket.connected) socket.emit('mediaLeave')
      closeAllPeers()
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [closeAllPeers, flushIce, getOrCreatePc, inCall, localStream, removeRemote, socket])

  useEffect(() => {
    if (!socket || !socket.connected || !inCall) return
    socket.emit('mediaJoin', {
      displayName: label,
      avatarUrl,
      frameColor,
    })
  }, [avatarUrl, frameColor, inCall, label, socket])

  const joinCall = useCallback(async (withCamera: boolean) => {
    setMediaErr(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaErr(
        'Este navegador no puede usar micrófono ni cámara aquí. Prueba con otro navegador o actualízalo.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: withCamera ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(withCamera)
      setInCall(true)
      setMapDockExpanded(true)
    } catch {
      setMediaErr(
        'No pudimos usar el micrófono o la cámara. Revisa los permisos junto a la barra de direcciones y que el dispositivo esté conectado.',
      )
    }
  }, [])

  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    setLocalStream(null)
    setInCall(false)
    setMapDockExpanded(false)
    setMediaErr(null)
  }, [])

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) return

    if (camOn) {
      for (const track of stream.getVideoTracks()) track.enabled = false
      setCamOn(false)
      return
    }

    const currentVideoTracks = stream.getVideoTracks()
    if (currentVideoTracks.length > 0) {
      for (const track of currentVideoTracks) track.enabled = true
      setCamOn(true)
      return
    }

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      const videoTrack = camStream.getVideoTracks()[0]
      if (!videoTrack) {
        setMediaErr('No se detectó cámara disponible en este dispositivo.')
        return
      }
      stream.addTrack(videoTrack)
      for (const pc of pcsRef.current.values()) {
        pc.addTrack(videoTrack, stream)
      }
      setLocalStream(new MediaStream(stream.getTracks()))
      setCamOn(true)
    } catch {
      setMediaErr('No pudimos habilitar la cámara. Revisa permisos y vuelve a intentarlo.')
    }
  }, [camOn])

  useEffect(() => {
    if (!localStream) return
    for (const track of localStream.getAudioTracks()) track.enabled = micOn
  }, [localStream, micOn])

  useEffect(() => {
    if (!localStream) return
    for (const track of localStream.getVideoTracks()) track.enabled = camOn
  }, [camOn, localStream])

  const remoteEntries = Object.entries(remotes)
  const compact = layout === 'map'

  const localHandRaised = useMemo(
    () => Boolean(playerSessionId && (roomState.raisedHands ?? []).includes(playerSessionId)),
    [playerSessionId, roomState.raisedHands],
  )

  const mapParticipants = useMemo(() => {
    if (!inCall || !localStream) return null
    const local = {
      id: 'local',
      label,
      isNarrator: session.role === 'dm',
      stream: localStream,
      muted: true,
      avatarUrl,
      frameColor,
    }
    const remotesList = remoteEntries.map(([id, remote]) => ({
      id,
      label: remote.label,
      isNarrator: isNarratorLabel(remote.label),
      stream: remote.stream,
      muted: false,
      avatarUrl: remote.avatarUrl,
      frameColor: remote.frameColor,
    }))
    const all = [local, ...remotesList]
    all.sort((a, b) => {
      if (a.isNarrator && !b.isNarrator) return -1
      if (!a.isNarrator && b.isNarrator) return 1
      if (a.id === 'local') return -1
      if (b.id === 'local') return 1
      return a.label.localeCompare(b.label)
    })
    return { all }
  }, [avatarUrl, frameColor, inCall, label, localStream, remoteEntries, session.role])

  const participants = useMemo(() => mapParticipants?.all ?? [], [mapParticipants])
  const participantsCount = participants.length
  const narratorParticipant = useMemo(
    () => participants.find((p) => p.isNarrator) ?? null,
    [participants],
  )
  const sideParticipants = useMemo(
    () => participants.filter((p) => !p.isNarrator),
    [participants],
  )
  const selfSideParticipant = useMemo(
    () => sideParticipants.find((p) => p.id === 'local') ?? null,
    [sideParticipants],
  )
  const remoteSideParticipants = useMemo(
    () => sideParticipants.filter((p) => p.id !== 'local'),
    [sideParticipants],
  )
  const speakingLevels = useSpeakingLevels(participants)
  const activeSpeakerId = useMemo(() => {
    let topId: string | null = null
    let topLevel = 0.06
    for (const participant of participants) {
      const level = speakingLevels[participant.id] ?? 0
      if (level > topLevel) {
        topLevel = level
        topId = participant.id
      }
    }
    return topId
  }, [participants, speakingLevels])

  const callToolbarInner = !inCall ? (
    <>
      <MediaIconBtn
        label="Habilitar cámara y unirme"
        title="Habilitar cámara y unirme"
        onClick={() => void joinCall(true)}
        variant="primary"
      >
        <IconJoinCall className="size-[1.15rem]" />
      </MediaIconBtn>
      <MediaIconBtn
        label="Unirme solo con micrófono"
        title="Unirme solo con micrófono"
        onClick={() => void joinCall(false)}
      >
        <IconMicOn className="size-[1.05rem]" />
      </MediaIconBtn>
    </>
  ) : (
    <>
      <MediaIconBtn
        label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        onClick={() => setMicOn((value) => !value)}
        pressed={micOn}
        off={!micOn}
      >
        {micOn ? (
          <IconMicOn className="size-[1.05rem]" />
        ) : (
          <IconMicOff className="size-[1.05rem]" />
        )}
      </MediaIconBtn>
      <MediaIconBtn
        label={camOn ? 'Apagar cámara' : 'Encender cámara'}
        title={camOn ? 'Apagar cámara' : 'Encender cámara'}
        onClick={() => void toggleCamera()}
        pressed={camOn}
        off={!camOn}
      >
        {camOn ? (
          <IconCamOn className="size-[1.05rem]" />
        ) : (
          <IconCamOff className="size-[1.05rem]" />
        )}
      </MediaIconBtn>
      <MediaIconBtn
        label="Colgar y salir de la llamada"
        title="Colgar y salir de la llamada"
        onClick={leaveCall}
        variant="danger"
      >
        <IconHangUp className="size-[1.1rem]" />
      </MediaIconBtn>
    </>
  )

  const toolbar = (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="toolbar"
      aria-label="Controles de llamada"
    >
      {callToolbarInner}
    </div>
  )

  const canRaiseHandOnMap =
    session.role === 'player' && session.claimedTokenId !== null && Boolean(playerSessionId)

  const mapCallToolbar = (
    <div
      className="vtt-media-dock-map-toolbar flex flex-wrap items-center justify-center gap-1.5"
      role="toolbar"
      aria-label="Controles de llamada y mano levantada"
    >
      {canRaiseHandOnMap ? (
        <button
          type="button"
          className={`vtt-media-icon-btn vtt-media-dock-map-raise ${localHandRaised ? 'vtt-media-dock-map-raise--on' : ''}`}
          aria-label={localHandRaised ? 'Bajar la mano' : 'Levantar la mano'}
          title={localHandRaised ? 'Bajar la mano' : 'Levantar la mano'}
          aria-pressed={localHandRaised}
          onClick={() => socket.emit('raiseHand', { raised: !localHandRaised })}
        >
          <span className="text-[0.92rem] leading-none" aria-hidden>
            ✋
          </span>
        </button>
      ) : null}
      {callToolbarInner}
    </div>
  )

  const filmstrip =
    inCall && localStream ? (
      <div
        className={`vtt-media-filmstrip flex gap-2 ${compact ? 'overflow-x-auto pb-1 pt-1' : 'flex-wrap justify-center py-2'}`}
      >
        <VideoThumb
          stream={localStream}
          name={`Tú · ${label}`}
          avatarUrl={avatarUrl}
          frameColor={frameColor}
          isSpeaking={(speakingLevels.local ?? 0) > 0.055}
          isLeadSpeaker={activeSpeakerId === 'local'}
          muted
          compact={compact}
          handRaised={localHandRaised}
          isNarrator={session.role === 'dm'}
        />
        {remoteEntries.map(([peerId, remote]) => (
          <VideoThumb
            key={peerId}
            stream={remote.stream}
            name={remote.label}
            avatarUrl={remote.avatarUrl}
            frameColor={remote.frameColor}
            isSpeaking={(speakingLevels[peerId] ?? 0) > 0.055}
            isLeadSpeaker={activeSpeakerId === peerId}
            compact={compact}
            isNarrator={isNarratorLabel(remote.label)}
          />
        ))}
      </div>
    ) : null

  const errBlock = mediaErr ? (
    <p
      role="alert"
      className={`text-xs text-[var(--vtt-danger-text)] ${compact ? 'border-b border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-3 py-2 text-center' : 'mt-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-ember)] bg-[var(--vtt-danger-bg)] px-3 py-2'}`}
    >
      {mediaErr}
    </p>
  ) : null

  if (layout === 'map') {
    const showNarratorStage = Boolean(
      inCall && localStream && narratorParticipant && narratorParticipant.id !== 'local',
    )
    const showSelfPip = Boolean(
      inCall && localStream && (session.role === 'dm' || Boolean(selfSideParticipant)),
    )
    const leftStackMaxH = showNarratorStage
      ? 'max-h-[min(56svh,calc(100%-min(28svh,10rem)-6.5rem))]'
      : 'max-h-[min(72svh,calc(100%-7rem))]'
    const mapDockToggle = (
      <button
        type="button"
        className="flex w-full max-w-[12.5rem] shrink-0 items-center justify-between gap-1.5 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border-subtle)] bg-[var(--vtt-bg-elevated)]/85 px-2 py-0.5 text-left"
        onClick={() => setMapDockExpanded((prev) => !prev)}
        aria-expanded={mapDockExpanded}
        aria-label={
          mapDockExpanded ? 'Ocultar lista de llamada y cámaras de otros' : 'Mostrar llamada de mesa'
        }
      >
        <span className="font-vtt-display text-[0.52rem] font-semibold uppercase leading-tight tracking-[0.16em] text-[var(--vtt-gold)]">
          Llamada
        </span>
        <span className="shrink-0 text-[0.58rem] text-[var(--vtt-text-muted)]">
          {inCall ? `${mapDockExpanded ? '−' : '+'} ${participantsCount}` : 'Off'}
        </span>
      </button>
    )

    return (
      <div className="pointer-events-none absolute inset-0 z-[86]" aria-label="Mesa de voz y cámara">
        {showNarratorStage && narratorParticipant ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[88] flex justify-center px-2 pt-2">
            <div
              className=" pointer-events-auto rounded-[var(--vtt-radius-sm)] p-1"
              style={{ paddingTop: 'max(0.35rem, env(safe-area-inset-top, 0px))' }}
            >
              <VideoThumb
                stream={narratorParticipant.stream}
                name={
                  narratorParticipant.id === 'local'
                    ? `Tú · ${label}`
                    : narratorParticipant.label
                }
                avatarUrl={
                  narratorParticipant.id === 'local' ? avatarUrl : narratorParticipant.avatarUrl
                }
                frameColor={narratorParticipant.frameColor}
                isSpeaking={(speakingLevels[narratorParticipant.id] ?? 0) > 0.055}
                isLeadSpeaker={activeSpeakerId === narratorParticipant.id}
                muted={narratorParticipant.muted}
                compact
                compactVariant="narrator"
                handRaised={narratorParticipant.id === 'local' ? localHandRaised : false}
                isNarrator
              />
            </div>
          </div>
        ) : null}

        {mapDockExpanded || showSelfPip ? (
          <div
            className={`pointer-events-auto absolute left-2 z-[87] flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain ${leftStackMaxH}`}
            style={{ bottom: 'max(4.35rem, calc(env(safe-area-inset-bottom, 0px) + 4.35rem))', maxWidth: '20rem' }}
          >
            {mapDockExpanded ? (
              <div className="vtt-media-dock-map-rail flex shrink-0 flex-col gap-2 rounded-[var(--vtt-radius)] px-2 py-2">
                <div
                  id={mapDockPanelId}
                  role="region"
                  aria-label="Cámaras de otros jugadores"
                  className="vtt-media-dock-map-content flex flex-col gap-2"
                >
                  {mediaErr ? (
                    <p
                      role="alert"
                      className="shrink-0 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-2 py-1.5 text-[0.65rem] text-[var(--vtt-danger-text)]"
                    >
                      {mediaErr}
                    </p>
                  ) : null}
                  {inCall && remoteSideParticipants.length > 0 ? (
                    <div className="vtt-media-filmstrip vtt-media-filmstrip--map-rail flex min-h-0 flex-col gap-2 pb-1 pt-1">
                      {remoteSideParticipants.map((p) => (
                        <VideoThumb
                          key={p.id}
                          stream={p.stream}
                          name={p.label}
                          avatarUrl={p.avatarUrl}
                          frameColor={p.frameColor}
                          isSpeaking={(speakingLevels[p.id] ?? 0) > 0.055}
                          isLeadSpeaker={activeSpeakerId === p.id}
                          muted={p.muted}
                          compact
                          isNarrator={false}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {showSelfPip && session.role === 'dm' && localStream ? (
              <div className=" pointer-events-auto shrink-0 rounded-[var(--vtt-radius-sm)] p-1 w-full">
                <VideoThumb
                  stream={localStream}
                  name={`Tú · ${label}`}
                  avatarUrl={avatarUrl}
                  frameColor={frameColor}
                  isSpeaking={(speakingLevels.local ?? 0) > 0.055}
                  isLeadSpeaker={activeSpeakerId === 'local'}
                  muted
                  compact
                  handRaised={localHandRaised}
                  isNarrator={false}
                />
              </div>
            ) : showSelfPip && selfSideParticipant ? (
              <div className=" pointer-events-auto shrink-0 rounded-[var(--vtt-radius-sm)] p-1 w-full">
                <VideoThumb
                  stream={selfSideParticipant.stream}
                  name={`Tú · ${label}`}
                  avatarUrl={avatarUrl}
                  frameColor={selfSideParticipant.frameColor}
                  isSpeaking={(speakingLevels[selfSideParticipant.id] ?? 0) > 0.055}
                  isLeadSpeaker={activeSpeakerId === selfSideParticipant.id}
                  muted={selfSideParticipant.muted}
                  compact
                  handRaised={localHandRaised}
                  isNarrator={false}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="vtt-media-dock-map-bottombar pointer-events-auto absolute bottom-0 left-1/2 z-[89] flex max-w-[28rem] -translate-x-1/2 flex-col items-center gap-1 rounded-t-[var(--vtt-radius-sm)] px-2 py-1"
          style={{ paddingBottom: 'max(0.2rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {mediaErr && !mapDockExpanded ? (
            <p
              role="alert"
              className="max-w-md rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-2 py-1 text-center text-[0.58rem] text-[var(--vtt-danger-text)]"
            >
              {mediaErr}
            </p>
          ) : null}
          {mapDockToggle}
          {mapCallToolbar}
        </div>
      </div>
    )
  }

  return (
    <section
      className="vtt-surface vtt-glow-border w-full shrink-0 overflow-hidden p-4"
      aria-label="Llamada de mesa (audio y vídeo)"
    >
      <div className="flex flex-col gap-1 border-b border-[var(--vtt-border-subtle)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-vtt-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--vtt-gold)]">
            Voz y cámara
          </h2>
          <p className="mt-1 max-w-md text-[0.7rem] leading-relaxed text-[var(--vtt-text-muted)]">
            Conexión entre navegadores. En el mapa: si el narrador está en otra pestaña su cámara va
            arriba; la tuya abajo a la izquierda como el resto; otras cámaras al expandir «Llamada» a
            la izquierda; mano y controles compactos abajo al centro.
          </p>
        </div>
        <div className="shrink-0 pt-2 sm:pt-0">{toolbar}</div>
      </div>

      {errBlock}
      {filmstrip ? <div className="-mx-1 mt-2">{filmstrip}</div> : null}
    </section>
  )
}
