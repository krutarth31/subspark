import { randomBytes, pbkdf2Sync } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const calc = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return calc === hash
}

export function generateToken(): string {
  return randomBytes(48).toString('hex')
}
