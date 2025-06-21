import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

interface DiscordRole {
  id: string
  name: string
}

export async function GET() {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ roles: [] }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ roles: [] }, { status: 401 })
    const integration = await db
      .collection<{ userId: ObjectId; guildId: string; accessToken: string; refreshToken: string; expiresAt?: Date }>('discordIntegrations')
      .findOne({ userId: session.userId })
    if (!integration || !integration.guildId || !integration.accessToken) {
      return NextResponse.json({ roles: [] })
    }
    let accessToken = integration.accessToken

    // Refresh the token if we have a refresh token and the access token is expired
    if (integration.expiresAt && integration.refreshToken && integration.expiresAt.getTime() < Date.now()) {
      const clientId = process.env.DISCORD_CLIENT_ID
      const clientSecret = process.env.DISCORD_CLIENT_SECRET
      if (clientId && clientSecret) {
        try {
          const refreshResp = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
              refresh_token: integration.refreshToken,
            }),
          })
          if (refreshResp.ok) {
            const data = await refreshResp.json()
            accessToken = data.access_token
            await db.collection('discordIntegrations').updateOne(
              { userId: session.userId },
              {
                $set: {
                  accessToken,
                  refreshToken: data.refresh_token,
                  expiresAt: new Date(Date.now() + data.expires_in * 1000),
                },
              }
            )
          } else {
            console.error('Token refresh failed', await refreshResp.text())
          }
        } catch (err) {
          console.error('Token refresh error', err)
        }
      }
    }

    async function fetchRoles(token: string) {
      const resp = await fetch(
        `https://discord.com/api/guilds/${integration.guildId}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return resp
    }

    let resp = await fetchRoles(accessToken)

    // If the access token is invalid but we have a refresh token, attempt to
    // refresh it and retry once more.
    if (resp.status === 401 && integration.refreshToken) {
      const clientId = process.env.DISCORD_CLIENT_ID
      const clientSecret = process.env.DISCORD_CLIENT_SECRET
      if (clientId && clientSecret) {
        try {
          const refreshResp = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
              refresh_token: integration.refreshToken,
            }),
          })
          if (refreshResp.ok) {
            const data = await refreshResp.json()
            accessToken = data.access_token
            await db.collection('discordIntegrations').updateOne(
              { userId: session.userId },
              {
                $set: {
                  accessToken,
                  refreshToken: data.refresh_token,
                  expiresAt: new Date(Date.now() + data.expires_in * 1000),
                },
              }
            )
            resp = await fetchRoles(accessToken)
          } else {
            console.error('Token refresh failed', await refreshResp.text())
          }
        } catch (err) {
          console.error('Token refresh error', err)
        }
      }
    }

    if (!resp.ok) {
      console.error('Fetch roles failed', await resp.text())
      return NextResponse.json({ roles: [] }, { status: 500 })
    }

    const data = (await resp.json()) as DiscordRole[] | null
    const roles = Array.isArray(data)
      ? data.map((r) => ({ id: r.id, name: r.name }))
      : []

    return NextResponse.json({ roles })
  } catch (err) {
    console.error('Roles API error', err)
    return NextResponse.json({ roles: [] }, { status: 500 })
  }
}
