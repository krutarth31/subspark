import { hashPassword, verifyPassword, generateToken, generateAccountId } from '@/lib/auth'

describe('auth utilities', () => {
  it('hashes and verifies passwords', () => {
    const hashed = hashPassword('secret')
    expect(verifyPassword('secret', hashed)).toBe(true)
    expect(verifyPassword('wrong', hashed)).toBe(false)
  })

  it('generates token and account id of expected length', () => {
    const token = generateToken()
    const acc = generateAccountId()
    expect(token).toHaveLength(96)
    expect(acc).toHaveLength(24)
    expect(token).not.toBe(generateToken())
  })
})
