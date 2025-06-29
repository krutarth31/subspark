import { NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google is not configured' }, { status: 500 })
  }

  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const state = generateToken()
  const redirectUri = encodeURIComponent(`${origin}/api/auth/google/callback`)
  const scope = encodeURIComponent('openid email profile')

  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`

  const res = NextResponse.json({ url })
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.headers.append(
    'Set-Cookie',
    `google_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${secure}`
  )
  return res
}
