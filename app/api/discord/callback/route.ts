import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const guildId = url.searchParams.get('guild_id')
  const state = url.searchParams.get('state')

  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET

  const redirectUrl = `${origin}/integrations`
  const res = NextResponse.redirect(redirectUrl)
  res.headers.append(
    'Set-Cookie',
    'discord_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure'
  )

  if (!code || !clientId || !clientSecret) {
    console.error('Missing code/client credentials')
    return res
  }

  const rawCookie = request.headers.get('cookie') ?? ''
  const cookieMap = Object.fromEntries(
    rawCookie.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  )

  const storedState = cookieMap['discord_state']
  const sessionToken = cookieMap['session']

  if (!storedState || state !== storedState) {
    console.error('CSRF state mismatch')
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
      console.error('Token exchange failed:', await tokenResp.text())
      return res
    }

    const tokenData = await tokenResp.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userResp.ok) {
      console.error('User fetch failed:', await userResp.text())
      return res
    }

    const user = await userResp.json()
    const ownerId = user.id

    let guildName = guildId || ''
    try {
      const guildResp = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (guildResp.ok) {
        const guilds = (await guildResp.json()) as { id: string; name: string }[]
        const g = guilds.find((x) => x.id === guildId)
        if (g) guildName = g.name
      } else {
        console.warn('Could not fetch guilds:', await guildResp.text())
      }
    } catch (err) {
      console.error('Guild fetch error:', err)
    }

    const db = await getDb()

    if (sessionToken) {
      const session = await db
        .collection<{ token: string; userId: ObjectId }>('sessions')
        .findOne({ token: sessionToken })

      if (session) {
        await db.collection('discordIntegrations').updateOne(
          { userId: session.userId },
          {
            $set: {
              guildId: guildId || null,
              guildName,
              ownerId,
              accessToken,
              refreshToken,
              expiresAt: new Date(Date.now() + expiresIn * 1000),
            },
          },
          { upsert: true }
        )
      } else {
        console.warn('Session not found for token:', sessionToken)
      }
    } else {
      console.warn('No session token in cookies')
    }
  } catch (err) {
    console.error('Discord callback exception:', err)
  }

  return res
}
