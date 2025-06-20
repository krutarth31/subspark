import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Discord is not configured' }, { status: 500 })
  }
  const redirectUri = encodeURIComponent(`${origin}/api/discord/callback`)
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=bot%20guilds.join`
  return NextResponse.json({ url })
}
