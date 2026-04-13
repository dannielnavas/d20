import type { ReactNode } from 'react'

type IconProps = { className?: string }

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconJoinCall({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="7" width="11" height="10" rx="2" />
      <path d="M15 9l5-3v12l-5-3V9z" />
    </Svg>
  )
}

export function IconMicOn({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v3M8 21h8" />
    </Svg>
  )
}

export function IconMicOff({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 2l20 20M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12v-2M12 18v3M8 21h8M12 14a3 3 0 01-3-3v-1" />
    </Svg>
  )
}

export function IconCamOn({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </Svg>
  )
}

export function IconCamOff({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 2l20 20" />
      <path d="M7 7h4l2-2h4v8.5M17 17H7a2 2 0 01-2-2V9" />
      <path d="M17 9l4-2v10l-4-2" />
    </Svg>
  )
}

export function IconHangUp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.68 13.31a16 16 0 01-3.93-2.95 16 16 0 01-2.95-3.93 1.2 1.2 0 01.36-1.55l1.78-1.27a1 1 0 011.05-.05 11.36 11.36 0 012.68 1.58 1 1 0 00.95 0l2.2-1.3a1 1 0 011.05.05l1.78 1.27a1.2 1.2 0 01.36 1.55 16 16 0 01-2.95 3.93 16 16 0 01-3.93 2.95 1 1 0 01-1.08 0z" />
    </Svg>
  )
}
