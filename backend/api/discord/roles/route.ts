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
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ roles: [] }, { status: 401 })
    }

    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token: sessionToken })

    if (!session) {
      return NextResponse.json({ roles: [] }, { status: 401 })
    }

    const integration = await db
      .collection<{ userId: ObjectId; guildId: string }>('discordIntegrations')
      .findOne({ userId: session.userId })

    if (!integration || !integration.guildId) {
      return NextResponse.json({ roles: [] }, { status: 404 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN is not set')
      return NextResponse.json({ roles: [] }, { status: 500 })
    }

    const response = await fetch(`https://discord.com/api/guilds/${integration.guildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch roles from Discord:', errorText)
      return NextResponse.json({ roles: [] }, { status: 500 })
    }

    const data = (await response.json()) as DiscordRole[]

    const roles = Array.isArray(data)
      ? data.map((r) => ({ id: r.id, name: r.name }))
      : []

    return NextResponse.json({ roles }, { status: 200 })
  } catch (err) {
    console.error('Error in /api/discord/roles:', err)
    return NextResponse.json({ roles: [] }, { status: 500 })
  }
}
