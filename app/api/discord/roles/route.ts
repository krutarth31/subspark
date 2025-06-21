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
      .collection<{ userId: ObjectId; guildId: string; accessToken: string }>('discordIntegrations')
      .findOne({ userId: session.userId })
    if (!integration || !integration.guildId || !integration.accessToken) {
      return NextResponse.json({ roles: [] })
    }
    const resp = await fetch(`https://discord.com/api/guilds/${integration.guildId}/roles`, {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
    })
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
