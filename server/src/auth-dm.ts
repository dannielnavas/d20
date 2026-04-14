import { SignJWT, jwtVerify } from 'jose'
import { DM_SECRET } from './dm-secret.js'

const encoder = new TextEncoder()

function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim() || DM_SECRET
  return encoder.encode(raw.slice(0, 256))
}

export async function signDmJwt(): Promise<{ token: string; expiresInSec: number }> {
  const expiresInSec = 8 * 60 * 60
  const token = await new SignJWT({ role: 'dm' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSec}s`)
    .sign(getJwtSecret())
  return { token, expiresInSec }
}

export async function verifyDmJwt(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret())
    return true
  } catch {
    return false
  }
}
