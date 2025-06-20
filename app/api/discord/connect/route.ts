import { NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord is not configured' },
      { status: 500 }
    )
  }
  const state = generateToken()
  const redirectUri = encodeURIComponent(`${origin}/api/discord/callback`)
  const scope =
    'identify%20guilds%20guilds.join%20bot'
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`
  const res = NextResponse.json({ url })
  res.headers.append(
    'Set-Cookie',
    `discord_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`
  )
  return res
}
