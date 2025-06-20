import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const guildId = url.searchParams.get('guild_id')
  const state = url.searchParams.get('state')
  const { origin } = url
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const res = NextResponse.redirect('/integrations')
  res.headers.append(
    'Set-Cookie',
    'discord_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  )
  if (!code || !clientId || !clientSecret) {
    return res
  }
  const cookieStore = await cookies()
  const stored = cookieStore.get('discord_state')?.value
  if (state !== stored) {
    return res
  }
  try {
    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/discord/callback`,
      }),
    })
    if (!tokenResp.ok) {
      console.error('Token exchange failed', await tokenResp.text())
      return res
    }
    const tokenData = await tokenResp.json()
    const accessToken = tokenData.access_token as string
    const refreshToken = tokenData.refresh_token as string
    const expiresIn = tokenData.expires_in as number

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const user = await userResp.json()
    const ownerId = user.id as string

    let guildName = guildId || ''
    try {
      const guildResp = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (guildResp.ok) {
        const guilds: { id: string; name: string }[] = await guildResp.json()
        const g = guilds.find((x) => x.id === guildId)
        if (g) guildName = g.name
      }
    } catch (err) {
      console.error('Guild fetch failed', err)
    }

    const db = await getDb()
    const token = cookieStore.get('session')?.value
    if (token) {
      const session = await db
        .collection<{ token: string; userId: ObjectId }>('sessions')
        .findOne({ token })
      if (session) {
        await db
          .collection<{
            userId: ObjectId
            guildId?: string
            guildName?: string
            ownerId?: string
            accessToken?: string
            refreshToken?: string
            expiresAt?: number
          }>('discordIntegrations')
          .updateOne(
            { userId: session.userId },
            {
              $set: {
                guildId: guildId || null,
                guildName,
                ownerId,
                accessToken,
                refreshToken,
                expiresAt: Date.now() + expiresIn * 1000,
              },
            },
            { upsert: true }
          )
      }
    }
  } catch (err) {
    console.error('Discord callback failed', err)
  }
  return res
}
