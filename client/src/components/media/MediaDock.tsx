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
}

type RemoteTile = { stream: MediaStream; label: string }

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
  if (session.role === 'dm') return 'DM'
  const id = session.claimedTokenId
  if (!id) return 'Jugador'
  const t = roomState.tokens.find((x) => x.id === id)
  return t?.name ?? 'Jugador'
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
  muted,
  compact,
}: {
  stream: MediaStream
  name: string
  muted?: boolean
  compact: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.srcObject = stream
    void el.play().catch(() => {})
    return () => {
      el.srcObject = null
    }
  }, [stream])

  return (
    <div
      className={
        compact
          ? 'relative h-[6.25rem] w-[10rem] shrink-0 overflow-hidden rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-black shadow-[0_6px_24px_rgba(0,0,0,0.55)] ring-1 ring-[rgba(201,164,58,0.12)]'
          : 'relative aspect-video w-[min(100%,11rem)] shrink-0 overflow-hidden rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-border)] bg-black shadow-[0_6px_24px_rgba(0,0,0,0.45)] ring-1 ring-[rgba(201,164,58,0.1)]'
      }
    >
      <video
        ref={ref}
        className="h-full w-full object-cover"
        playsInline
        muted={muted}
        autoPlay
        aria-label={name}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-1 pb-1 pt-4">
        <p className="truncate text-center font-vtt-display text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-[var(--vtt-gold)]">
          {name}
        </p>
      </div>
    </div>
  )
}

export function MediaDock({ socket, session, roomState, layout }: MediaDockProps) {
  const label = useMemo(
    () => localDisplayName(session, roomState),
    [session, roomState],
  )
  const labelRef = useRef(label)
  labelRef.current = label

  const [inCall, setInCall] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [remotes, setRemotes] = useState<Record<string, RemoteTile>>({})
  const [mediaErr, setMediaErr] = useState<string | null>(null)

  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const iceBufRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const labelsRef = useRef(new Map<string, string>())
  const localStreamRef = useRef<MediaStream | null>(null)
  localStreamRef.current = localStream

  const updateRemote = useCallback((peerId: string, stream: MediaStream) => {
    setRemotes((prev) => ({
      ...prev,
      [peerId]: {
        stream,
        label: labelsRef.current.get(peerId) ?? 'Participante',
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
    for (const c of pending) {
      void pc.addIceCandidate(c).catch(() => {})
    }
  }, [])

  const closeAllPeers = useCallback(() => {
    for (const pc of pcsRef.current.values()) {
      pc.close()
    }
    pcsRef.current.clear()
    iceBufRef.current.clear()
    labelsRef.current.clear()
    setRemotes({})
  }, [])

  const getOrCreatePc = useCallback(
    (remoteId: string) => {
      let pc = pcsRef.current.get(remoteId)
      if (pc) return pc
      pc = new RTCPeerConnection({ iceServers: iceServers() })
      pcsRef.current.set(remoteId, pc)

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !socket.connected) return
        socket.emit('webrtcSignal', {
          targetId: remoteId,
          payload: { type: 'ice', candidate: ev.candidate.toJSON() },
        })
      }

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? new MediaStream([ev.track])
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
      peers: { peerId: string; displayName: string }[]
    }) => {
      const stream = localStreamRef.current
      if (!stream) return
      for (const p of msg.peers) {
        labelsRef.current.set(p.peerId, p.displayName)
        try {
          const pc = getOrCreatePc(p.peerId)
          const senders = pc.getSenders()
          for (const t of stream.getTracks()) {
            if (!senders.some((s) => s.track === t)) {
              pc.addTrack(t, stream)
            }
          }
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socket.emit('webrtcSignal', {
            targetId: p.peerId,
            payload: { type: 'offer', sdp: offer.sdp! },
          })
        } catch {
          setMediaErr('No se pudo negociar la conexión con un participante')
        }
      }
    }

    const onPeerJoined = (msg: { peerId: string; displayName: string }) => {
      labelsRef.current.set(msg.peerId, msg.displayName)
      setRemotes((prev) => {
        if (!prev[msg.peerId]) return prev
        return {
          ...prev,
          [msg.peerId]: { ...prev[msg.peerId], label: msg.displayName },
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

          for (const t of stream.getTracks()) {
            if (!pc.getSenders().some((s) => s.track === t)) {
              pc.addTrack(t, stream)
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
          setMediaErr('Error al aceptar la conexión entrante')
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
          setMediaErr('Error al completar la conexión')
        }
      }
    }

    const onMediaErr = (msg: { message?: string }) => {
      setMediaErr(msg?.message ?? 'Error de vídeo')
    }

    const onDisconnect = () => {
      setMediaErr('Conexión perdida: la llamada se ha cerrado')
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      setLocalStream(null)
      setInCall(false)
    }

    socket.on('mediaPeersSnapshot', onSnapshot)
    socket.on('mediaPeerJoined', onPeerJoined)
    socket.on('mediaPeerLeft', onPeerLeft)
    socket.on('webrtcSignal', onSignal)
    socket.on('mediaError', onMediaErr)
    socket.on('disconnect', onDisconnect)

    socket.emit('mediaJoin', { displayName: labelRef.current })

    return () => {
      socket.off('mediaPeersSnapshot', onSnapshot)
      socket.off('mediaPeerJoined', onPeerJoined)
      socket.off('mediaPeerLeft', onPeerLeft)
      socket.off('webrtcSignal', onSignal)
      socket.off('mediaError', onMediaErr)
      socket.off('disconnect', onDisconnect)
      if (socket.connected) socket.emit('mediaLeave')
      closeAllPeers()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [closeAllPeers, flushIce, getOrCreatePc, inCall, localStream, removeRemote, socket])

  const joinCall = useCallback(async () => {
    setMediaErr(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaErr('Tu navegador no permite captura de audio/vídeo')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(true)
      setInCall(true)
    } catch {
      setMediaErr('Permiso denegado o dispositivo no disponible')
    }
  }, [])

  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    setLocalStream(null)
    setInCall(false)
    setMediaErr(null)
  }, [])

  useEffect(() => {
    if (!localStream) return
    for (const t of localStream.getAudioTracks()) {
      t.enabled = micOn
    }
  }, [localStream, micOn])

  useEffect(() => {
    if (!localStream) return
    for (const t of localStream.getVideoTracks()) {
      t.enabled = camOn
    }
  }, [camOn, localStream])

  const remoteEntries = Object.entries(remotes)
  const compact = layout === 'map'

  const mapParticipants = useMemo(() => {
    if (!inCall || !localStream) return null
    const local = {
      id: 'local',
      label,
      isDm: session.role === 'dm',
      stream: localStream,
      muted: true,
    }
    const rem = remoteEntries.map(([id, { label: remoteLabel, stream }]) => ({
      id,
      label: remoteLabel,
      isDm: remoteLabel.trim().toLowerCase() === 'dm',
      stream,
      muted: false,
    }))
    const all = [local, ...rem]
    const dm = all.find((p) => p.isDm) ?? null
    const players = all.filter((p) => !p.isDm)
    return {
      top: dm ?? players[0] ?? null,
      left: dm ? players[0] ?? null : players[1] ?? null,
      right: dm ? players[1] ?? null : players[2] ?? null,
      hiddenPlayers: Math.max(0, players.length - (dm ? 2 : 3)),
    }
  }, [inCall, label, localStream, remoteEntries, session.role])

  const toolbar = (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="toolbar"
      aria-label="Controles de llamada"
    >
      {!inCall ? (
        <MediaIconBtn
          label="Unirse con audio y vídeo"
          title="Unirse con audio y vídeo"
          onClick={joinCall}
          variant="primary"
        >
          <IconJoinCall className="size-[1.15rem]" />
        </MediaIconBtn>
      ) : (
        <>
          <MediaIconBtn
            label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
            title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
            onClick={() => setMicOn((v) => !v)}
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
            onClick={() => setCamOn((v) => !v)}
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
      )}
    </div>
  )

  const filmstrip =
    inCall && localStream ? (
      <div
        className={`vtt-media-filmstrip flex gap-2 ${compact ? 'overflow-x-auto pb-1 pt-1' : 'flex-wrap justify-center py-2'}`}
      >
        <VideoThumb stream={localStream} name={`Tú · ${label}`} muted compact={compact} />
        {remoteEntries.map(([peerId, { stream, label: remoteLabel }]) => (
          <VideoThumb key={peerId} stream={stream} name={remoteLabel} compact={compact} />
        ))}
      </div>
    ) : null

  const errBlock =
    mediaErr ? (
      <p
        role="alert"
        className={`text-xs text-[var(--vtt-danger-text)] ${compact ? 'border-b border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-3 py-2 text-center' : 'mt-3 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-ember)] bg-[var(--vtt-danger-bg)] px-3 py-2'}`}
      >
        {mediaErr}
      </p>
    ) : null

  if (layout === 'map') {
    return (
      <div className="pointer-events-none fixed inset-0 z-[86]" aria-label="Mesa de voz y cámara">
        {mediaErr ? (
          <p
            role="alert"
            className="pointer-events-auto absolute left-1/2 top-3 z-[87] -translate-x-1/2 rounded-[var(--vtt-radius-sm)] border border-[var(--vtt-danger-border)] bg-[var(--vtt-danger-bg)] px-3 py-1.5 text-xs text-[var(--vtt-danger-text)]"
          >
            {mediaErr}
          </p>
        ) : null}

        {mapParticipants?.top ? (
          <div className="absolute left-1/2 top-3 z-[86] -translate-x-1/2">
            <VideoThumb
              stream={mapParticipants.top.stream}
              name={mapParticipants.top.label}
              muted={mapParticipants.top.muted}
              compact
            />
          </div>
        ) : null}

        {mapParticipants?.left ? (
          <div className="absolute left-3 top-1/2 z-[86] -translate-y-1/2">
            <VideoThumb
              stream={mapParticipants.left.stream}
              name={mapParticipants.left.label}
              muted={mapParticipants.left.muted}
              compact
            />
          </div>
        ) : null}

        {mapParticipants?.right ? (
          <div className="absolute right-3 top-1/2 z-[86] -translate-y-1/2">
            <VideoThumb
              stream={mapParticipants.right.stream}
              name={mapParticipants.right.label}
              muted={mapParticipants.right.muted}
              compact
            />
          </div>
        ) : null}

        {mapParticipants && mapParticipants.hiddenPlayers > 0 ? (
          <div className="absolute right-4 top-[calc(50%+4.4rem)] z-[86] rounded-full border border-[var(--vtt-border)] bg-[var(--vtt-bg-elevated)] px-2 py-1 font-vtt-display text-[0.62rem] uppercase tracking-[0.18em] text-[var(--vtt-text-muted)]">
            +{mapParticipants.hiddenPlayers}
          </div>
        ) : null}

        <div
          className="vtt-media-dock-map-shell pointer-events-auto absolute bottom-0 left-1/2 z-[87] w-[min(20rem,calc(100vw-1rem))] -translate-x-1/2 rounded-t-[var(--vtt-radius)] px-2 py-2"
          style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {toolbar}
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
            Conexión entre navegadores. En el mapa la barra queda fija abajo.
          </p>
        </div>
        <div className="shrink-0 pt-2 sm:pt-0">{toolbar}</div>
      </div>

      {errBlock}

      {filmstrip ? <div className="-mx-1 mt-2">{filmstrip}</div> : null}
    </section>
  )
}
