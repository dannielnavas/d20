export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

export const D20_ROLL_GIF =
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzJqN2d2cXVhbWd6c3ljMDl1N3pjazB4b3AzNTAzZjBiamxxOWJ2dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/oOBTO2UcSoaBJewZT0/giphy.gif'

export const sessionPwdStorageKey = (id: string) => `d20-vtt-session-pwd-${id}`

export const dmTokenStorageKey = (id: string) => `d20-dm-jwt-${id}`
