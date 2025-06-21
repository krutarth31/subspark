import { NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord is not configured' },
      { status: 500 }
    )
  }

  // Get origin from headers (support local + prod)
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const state = generateToken()
  const redirectUri = encodeURIComponent(`${origin}/api/discord/callback`)
  const permissions = '268436482'
  const scope = encodeURIComponent('bot applications.commands identify guilds.join')

  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&permissions=${permissions}`

  const res = NextResponse.json({ url })
  res.headers.append(
    'Set-Cookie',
    `discord_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax; Secure`
  )
  return res
}
