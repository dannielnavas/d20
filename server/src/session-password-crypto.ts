import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

export function hashSessionPassword(plain: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTS)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

export function verifySessionPassword(plain: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [saltHex, keyHex] = parts
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(saltHex, 'hex')
    expected = Buffer.from(keyHex, 'hex')
  } catch {
    return false
  }
  if (salt.length === 0 || expected.length !== KEYLEN) return false
  const actual = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTS)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
